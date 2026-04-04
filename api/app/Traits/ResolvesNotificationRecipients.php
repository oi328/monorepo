<?php

namespace App\Traits;

use App\Models\User;

trait ResolvesNotificationRecipients
{
    protected function buildNotificationRecipients(User $baseUser, array $options, string $moduleKey, string $notificationKey): array
    {
        $settings = $baseUser->notificationSettings;

        $booleanField = null;
        switch ($notificationKey) {
            case 'notify_assigned_leads':
                $booleanField = 'notify_assigned_leads';
                break;
            case 'notify_delay_leads':
                $booleanField = 'notify_delay_leads';
                break;
            case 'notify_requests':
                $booleanField = 'notify_requests';
                break;
            case 'notify_rent_end_date':
                $booleanField = 'notify_rent_end_date';
                break;
            case 'notify_add_customer':
                $booleanField = 'notify_add_customer';
                break;
            case 'notify_create_invoice':
                $booleanField = 'notify_create_invoice';
                break;
            case 'notify_open_ticket':
                $booleanField = 'notify_open_ticket';
                break;
            case 'notify_campaign_expired':
                $booleanField = 'notify_campaign_expired';
                break;
            case 'notify_task_assigned':
                $booleanField = 'notify_task_assigned';
                break;
            case 'notify_task_expired':
                $booleanField = 'notify_task_expired';
                break;
        }

        // Delayed lead actions are critical; do not suppress recipients for notify_delay_leads.
        if ($notificationKey !== 'notify_delay_leads' && $booleanField && $settings && $settings->{$booleanField} === false) {
            return [];
        }

        $meta = $settings?->meta_data ?? [];
        $modules = is_array($meta['modules'] ?? null) ? $meta['modules'] : [];

        $moduleConfig = null;
        foreach ($modules as $module) {
            if (($module['key'] ?? null) === $moduleKey) {
                $moduleConfig = $module;
                break;
            }
        }

        $notifConfig = null;
        if ($moduleConfig && is_array($moduleConfig['notifications'] ?? null)) {
            foreach ($moduleConfig['notifications'] as $n) {
                if (($n['key'] ?? null) === $notificationKey) {
                    $notifConfig = $n;
                    break;
                }
            }
        }

        $enabledFlag = $notifConfig['enabled'] ?? null;
        if ($notificationKey !== 'notify_delay_leads' && is_bool($enabledFlag) && $enabledFlag === false) {
            return [];
        }

        $baseRecipients = [
            'owner' => false,
            'assignee' => true,
            'manager' => false,
            'assigner' => false,
            'previous_owner' => false,
            'team_leader' => false,
            'director' => false,
            'operations_manager' => false,
            'sales_admin' => false,
            'sales_manager' => false,
            'branch_manager' => false,
            'marketing_manager' => false,
            'marketing_moderator' => false,
            'custom_user_ids' => [],
        ];

        if ($notificationKey === 'notify_task_assigned') {
            $baseRecipients['owner'] = true;
        }

        if ($notificationKey === 'notify_assigned_leads') {
            $baseRecipients['manager'] = true;
            $baseRecipients['assigner'] = true;
        }

        $recipientsFlags = $baseRecipients;
        if ($notifConfig && isset($notifConfig['recipients']) && is_array($notifConfig['recipients'])) {
            $recipientsFlags = array_merge($recipientsFlags, $notifConfig['recipients']);
        }

        $owner = $options['owner'] ?? null;
        $assignee = $options['assignee'] ?? $baseUser;
        $assigner = $options['assigner'] ?? null;
        $previousOwner = $options['previous_owner'] ?? null;

        if ($assignee && (!$assignee->relationLoaded('manager') || !$assignee->relationLoaded('team'))) {
            $assignee->loadMissing(['manager', 'team.leader']);
        }

        $manager = $options['manager'] ?? ($assignee ? $assignee->manager : null);
        $teamLeader = $options['team_leader'] ?? ($assignee && $assignee->team ? $assignee->team->leader : null);

        $users = [];

        if (!empty($recipientsFlags['owner']) && $owner instanceof User) {
            $users[$owner->id] = $owner;
        }

        if (!empty($recipientsFlags['assignee']) && $assignee instanceof User) {
            $users[$assignee->id] = $assignee;
        }

        if (!empty($recipientsFlags['assigner']) && $assigner instanceof User) {
            $users[$assigner->id] = $assigner;
        }

        if (!empty($recipientsFlags['manager']) && $manager instanceof User) {
            $users[$manager->id] = $manager;
        }

        if (!empty($recipientsFlags['team_leader']) && $teamLeader instanceof User) {
            $users[$teamLeader->id] = $teamLeader;
        }

        if (!empty($recipientsFlags['previous_owner']) && $previousOwner instanceof User) {
            $users[$previousOwner->id] = $previousOwner;
        }

        $tenantId = $assignee?->tenant_id ?? $baseUser->tenant_id ?? null;

        $roleMap = [
            'director' => ['director'],
            'operations_manager' => ['operation manager', 'operations manager'],
            'sales_admin' => ['sales admin'],
            'sales_manager' => ['sales manager'],
            'branch_manager' => ['branch manager'],
            'marketing_manager' => ['marketing manager'],
            'marketing_moderator' => ['marketing moderator'],
        ];

        foreach ($roleMap as $flagKey => $roleNames) {
            if (empty($recipientsFlags[$flagKey]) || !$tenantId) {
                continue;
            }

            $roleNamesLower = array_map('strtolower', $roleNames);

            $query = User::where('tenant_id', $tenantId)->where(function ($q) use ($roleNamesLower) {
                $q->whereIn('job_title', $roleNamesLower)
                    ->orWhereIn('job_title', $roleNamesLower);
            });

            $query->orWhereHas('roles', function ($q) use ($roleNamesLower) {
                $q->whereIn('name', $roleNamesLower);
            });

            $matched = $query->get();
            foreach ($matched as $u) {
                $users[$u->id] = $u;
            }
        }

        $customUserIds = $recipientsFlags['custom_user_ids'] ?? [];
        if (is_array($customUserIds) && count($customUserIds) > 0) {
            $customUsers = User::whereIn('id', $customUserIds)->get();
            foreach ($customUsers as $u) {
                $users[$u->id] = $u;
            }
        }

        return array_values($users);
    }
}
