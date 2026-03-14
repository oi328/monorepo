<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\Visit;
use App\Models\Export;
use App\Models\Revenue;
use App\Traits\UserHierarchyTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ReportsController extends Controller
{
    use UserHierarchyTrait;

    public function dashboardStats(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // Get viewable user IDs for filtering (Hierarchy)
        $viewableUserIds = $this->getViewableUserIds($user);

        // Helper to get count and trend with hierarchy filtering
        $getStats = function ($model, $dateColumn = 'created_at', $conditions = [], $sumColumn = null) use ($startOfMonth, $endOfMonth, $startOfLastMonth, $endOfLastMonth, $user, $viewableUserIds) {
            $query = $model::query();
            
            // Apply tenant scope
            if ($user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            // Apply visibility filters (Hierarchy)
            if ($viewableUserIds !== null) {
                 $assignedColumn = 'assigned_to';
                 if ($model === Visit::class) {
                     $assignedColumn = 'sales_person_id';
                 } elseif ($model === LeadAction::class || $model === Revenue::class || $model === Export::class) {
                     $assignedColumn = 'user_id';
                 }
                 $query->whereIn($assignedColumn, $viewableUserIds);
            }
            
            foreach ($conditions as $column => $value) {
                if (is_array($value)) {
                    $query->whereIn($column, $value);
                } else {
                    $query->where($column, $value);
                }
            }

            // Calculate Values
            if ($sumColumn) {
                $currentValue = (clone $query)->whereBetween($dateColumn, [$startOfMonth, $endOfMonth])->sum($sumColumn);
                $lastMonthValue = (clone $query)->whereBetween($dateColumn, [$startOfLastMonth, $endOfLastMonth])->sum($sumColumn);
                $totalValue = $query->sum($sumColumn);
            } else {
                $currentValue = (clone $query)->whereBetween($dateColumn, [$startOfMonth, $endOfMonth])->count();
                $lastMonthValue = (clone $query)->whereBetween($dateColumn, [$startOfLastMonth, $endOfLastMonth])->count();
                $totalValue = $query->count();
            }

            // Calculate Trend
            $trend = 0;
            if ($lastMonthValue > 0) {
                $trend = (($currentValue - $lastMonthValue) / $lastMonthValue) * 100;
            } elseif ($currentValue > 0) {
                $trend = 100;
            }

            return [
                'value' => $totalValue,
                'trend' => round($trend, 1),
                'trendUp' => $trend >= 0
            ];
        };

        // 1. Leads Pipeline (Total Leads)
        $leadsStats = $getStats(Lead::class);

        // 2. Sales Activities (Total Activities)
        $activitiesStats = $getStats(LeadAction::class);

        // 3. Meetings Report
        $meetingsStats = $getStats(LeadAction::class, 'created_at', ['action_type' => 'meeting']);

        // 4. Reservations Report
        $reservationsStats = $getStats(LeadAction::class, 'created_at', ['action_type' => 'reservation']);

        // 5. Closed Deals
        $dealsStats = $getStats(LeadAction::class, 'created_at', ['action_type' => 'closing_deals']);

        // 6. Rent Report
        $rentStats = $getStats(LeadAction::class, 'created_at', ['action_type' => 'rent']);

        // 7. Proposals Report
        $proposalsStats = $getStats(LeadAction::class, 'created_at', ['action_type' => 'proposal']);

        // 8. Check In Report
        $checkInStats = $getStats(Visit::class, 'check_in_at');

        // 9. Customers Report (Leads converted to customers)
        $customersStats = $getStats(Lead::class, 'created_at', ['status' => ['won', 'customer', 'converted']]);

        // 10. Targets & Revenue (Sum amount)
        $revenueStats = $getStats(Revenue::class, 'created_at', [], 'amount');

        // 11. Imports Report
        $importsStats = $getStats(Export::class, 'created_at', ['action' => 'import']);

        // 12. Export Report
        $exportsStats = $getStats(Export::class, 'created_at', ['action' => 'export']);


        return response()->json([
            'leads_pipeline' => $leadsStats,
            'sales_activities' => $activitiesStats,
            'meetings_report' => $meetingsStats,
            'reservations_report' => $reservationsStats,
            'closed_deals' => $dealsStats,
            'rent_report' => $rentStats,
            'proposals_report' => $proposalsStats,
            'check_in_report' => $checkInStats,
            'customers_report' => $customersStats,
            'targets_revenue' => $revenueStats,
            'imports_report' => $importsStats,
            'export_report' => $exportsStats,
        ]);
    }

    public function teamStats(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        Log::info('teamStats User: ' . $user->id . ' - ' . $user->name);
        Log::info('teamStats Roles: ' . $user->getRoleNames()->implode(', '));

        // Determine scope: Tenant Admin/Director sees all, others see subordinates
        $query = \App\Models\User::with(['roles']);
        
        $hasFullAccess = $user->hasAnyRole(['Tenant Admin', 'Director', 'General Manager', 'Owner', 'Super Admin']);
        Log::info('teamStats hasFullAccess: ' . ($hasFullAccess ? 'Yes' : 'No'));

        if (!$hasFullAccess) {
            $query->where('manager_id', $user->id);
        }

        $subordinates = $query->get();
            
        if ($subordinates->isEmpty()) {
            return response()->json([]);
        }

        $subordinateIds = $subordinates->pluck('id');

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // Leads count per user (assigned_to) - This Month
        $leads = Lead::whereIn('assigned_to', $subordinateIds)
                     ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                     ->select('assigned_to', DB::raw('count(*) as count'))
                     ->groupBy('assigned_to')
                     ->pluck('count', 'assigned_to');

        // Revenue per user (user_id) - This Month
        $revenue = Revenue::whereIn('user_id', $subordinateIds)
                          ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                          ->select('user_id', DB::raw('sum(amount) as total'))
                          ->groupBy('user_id')
                          ->pluck('total', 'user_id');

        // Activities per user (user_id) - This Month
        $activities = LeadAction::whereIn('user_id', $subordinateIds)
                                ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                                ->select('user_id', DB::raw('count(*) as count'))
                                ->groupBy('user_id')
                                ->pluck('count', 'user_id');
                                
        $data = $subordinates->map(function($sub) use ($leads, $revenue, $activities) {
            $monthlyRevenue = $revenue[$sub->id] ?? 0;
            $monthlyTarget = (float)($sub->monthly_target ?? 0);
            
            return [
                'id' => $sub->id,
                'name' => $sub->name,
                'role' => $sub->roles->first()?->name ?? $sub->role,
                'job_title' => $sub->job_title,
                'avatar_url' => $sub->avatar_url,
                'monthly_target' => $monthlyTarget,
                'yearly_target' => (float)($sub->yearly_target ?? 0),
                
                'leads_count' => $leads[$sub->id] ?? 0,
                'revenue' => $monthlyRevenue,
                'activities_count' => $activities[$sub->id] ?? 0,
                'achievement_percent' => ($monthlyTarget > 0) 
                     ? round(($monthlyRevenue / $monthlyTarget) * 100, 1) 
                     : 0
            ];
        });

        return response()->json($data);
    }
}
