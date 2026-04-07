<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\Stage;
use App\Models\Tenant;
use App\Services\LeadRotationEngine;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class ProcessRotationRules extends Command
{
    protected $signature = 'rotation:process {--tenant= : Tenant ID or slug}';
    protected $description = 'Process rotation: assign new leads (stage=New) and delay rotation based on next action date and stage delay time';

    public function handle(LeadRotationEngine $engine): int
    {
        $optTenant = $this->option('tenant');

        $tenants = Tenant::query();
        if ($optTenant) {
            if (is_numeric($optTenant)) {
                $tenants->where('id', (int) $optTenant);
            } else {
                $tenants->where('slug', (string) $optTenant);
            }
        }

        $tenants = $tenants->get();
        if ($tenants->isEmpty()) {
            $this->info('No tenants matched.');
            return 0;
        }

        foreach ($tenants as $tenant) {
            $tenantId = (int) $tenant->id;

            try {
                app()->instance('current_tenant_id', $tenantId);
                setPermissionsTeamId($tenantId);
            } catch (\Throwable $e) {
            }

            $settings = $engine->getSettings($tenantId);
            if (!$settings->allow_assign_rotation && !$settings->delay_assign_rotation) {
                continue;
            }

            if ($settings->allow_assign_rotation && $engine->isWithinWindow((string) $settings->work_from, (string) $settings->work_to, now())) {
                $this->processAssignNew($tenantId, $engine);
            }

            $delayFrom = (string) ($settings->delay_work_from ?: $settings->work_from);
            $delayTo = (string) ($settings->delay_work_to ?: $settings->work_to);
            if ($settings->delay_assign_rotation && $engine->isWithinWindow($delayFrom, $delayTo, now())) {
                $this->processDelayRotation($tenantId, $engine);
            }
        }

        return 0;
    }

    private function processAssignNew(int $tenantId, LeadRotationEngine $engine): void
    {
        $leads = Lead::query()
            ->where('tenant_id', $tenantId)
            ->whereNull('assigned_to')
            ->where(function ($q) {
                $q->whereNull('stage')
                    ->orWhereIn('stage', ['new', 'New Lead', 'New', 'new lead', 'New lead']);
            })
            ->orderBy('id')
            ->limit(300)
            ->get();

        foreach ($leads as $lead) {
            if (!$engine->isNewLeadStage($lead)) {
                continue;
            }

            $filters = $engine->resolveLeadFilters($lead, $tenantId);
            $queueKey = $engine->buildQueueKey($lead, $filters);
            $eligible = $engine->getEligibleAssignUserIds($tenantId, $filters);
            if (!$eligible) {
                continue;
            }

            $next = $engine->pickNextUserId($tenantId, $queueKey, $eligible);
            if (!$next) {
                continue;
            }

            $engine->assignLeadToUser($lead, $next);
        }
    }

    private function processDelayRotation(int $tenantId, LeadRotationEngine $engine): void
    {
        if (!Schema::hasColumn('stages', 'delay_time')) {
            return;
        }

        $stageDelay = Stage::query()
            ->withoutGlobalScope('tenant')
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            })
            ->pluck('delay_time', 'name')
            ->toArray();

        $actionRows = LeadAction::query()
            ->whereIn('details->status', ['pending', 'in_progress', 'in-progress', 'in progress'])
            ->whereNotNull('details->date')
            ->where('details->date', '!=', '')
            ->where(function ($q) {
                $q->whereNotIn('action_type', ['closing_deals', 'cancel'])
                    ->whereNotIn('next_action_type', ['closing_deals', 'cancel']);
            })
            ->selectRaw('lead_id, max(id) as max_id')
            ->groupBy('lead_id')
            ->limit(2000)
            ->get();

        if ($actionRows->isEmpty()) {
            return;
        }

        $latestActionIds = $actionRows->pluck('max_id')->map(fn ($v) => (int) $v)->values()->all();
        $actionsByLead = LeadAction::query()
            ->whereIn('id', $latestActionIds)
            ->get()
            ->keyBy('lead_id');

        $leadIds = $actionRows->pluck('lead_id')->map(fn ($v) => (int) $v)->values()->all();
        $leads = Lead::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $leadIds)
            ->whereNotNull('assigned_to')
            ->get();

        $now = Carbon::now(config('app.timezone'));

        foreach ($leads as $lead) {
            $delayHours = (int) ($stageDelay[(string) $lead->stage] ?? 0);
            if ($delayHours <= 0) {
                continue;
            }

            $action = $actionsByLead->get($lead->id);
            if (!$action) {
                continue;
            }

            $details = is_array($action->details ?? null) ? ($action->details ?? []) : (json_decode($action->details, true) ?? []);
            $date = trim((string) ($details['date'] ?? ''));
            $time = trim((string) ($details['time'] ?? ''));
            if ($date === '') {
                continue;
            }
            if ($time === '') {
                $time = '00:00';
            }

            try {
                $scheduled = Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . substr($time, 0, 5), config('app.timezone'));
            } catch (\Throwable $e) {
                try {
                    $scheduled = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $time, config('app.timezone'));
                } catch (\Throwable $ex) {
                    continue;
                }
            }

            $isDelayed = $now->greaterThanOrEqualTo($scheduled->copy()->addHours($delayHours));
            if (!$isDelayed) {
                continue;
            }

            $assignedTo = (int) ($lead->assigned_to ?? 0);
            if (!$assignedTo) {
                continue;
            }

            $filters = $engine->resolveLeadFilters($lead, $tenantId);
            if (!$engine->isUserInDelayRotation($tenantId, $assignedTo, $filters)) {
                $engine->unassignToAdminFallback($lead);
                continue;
            }

            $eligible = $engine->getEligibleAssignUserIds($tenantId, $filters);
            if (!$eligible) {
                $engine->unassignToAdminFallback($lead);
                continue;
            }

            $queueKey = $engine->buildQueueKey($lead, $filters);
            $next = $engine->pickNextAfterUserId($tenantId, $queueKey, $eligible, $assignedTo);
            if (!$next) {
                $engine->unassignToAdminFallback($lead);
                continue;
            }

            if ($next === $assignedTo) {
                continue;
            }

            $engine->assignLeadToUser($lead, $next);
        }
    }
}
