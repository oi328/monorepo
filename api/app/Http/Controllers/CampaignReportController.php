<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Campaign;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CampaignReportController extends Controller
{
    public function dashboard(Request $request)
    {
        // 1. Overview Counts
        $overview = [
            'active' => Campaign::where('status', 'active')->orWhere('status', 'ACTIVE')->count(),
            'inactive' => Campaign::where('status', 'inactive')->orWhere('status', 'ARCHIVED')->orWhere('status', 'COMPLETED')->count(),
            'paused' => Campaign::where('status', 'paused')->orWhere('status', 'PAUSED')->count(),
        ];

        // 2. Cost & Revenue by Channel (Provider)
        // Group by provider first, if null fall back to source
        // Since we can't easily group by a coalesce in strict mode without raw query that might be db-specific,
        // we'll fetch all and aggregate in collection for safety and flexibility.
        
        $campaigns = Campaign::select('id', 'name', 'provider', 'source', 'spend', 'revenue', 'leads', 'impressions', 'start_date', 'status', 'profit', 'roi')
            ->get();

        $channels = $campaigns->groupBy(function($item) {
            $p = $item->provider ? strtolower($item->provider) : ($item->source ? strtolower($item->source) : 'unknown');
            // Normalize names
            if (str_contains($p, 'facebook') || str_contains($p, 'meta')) return 'Meta';
            if (str_contains($p, 'google')) return 'Google';
            if (str_contains($p, 'whatsapp')) return 'WhatsApp';
            if (str_contains($p, 'tiktok')) return 'TikTok';
            return ucfirst($p);
        })->map(function($group, $channelName) {
            $spend = $group->sum('spend');
            $revenue = $group->sum('revenue');
            $leads = $group->sum('leads');
            $impressions = $group->sum('impressions');
            
            // Recalculate ROI/Profit for the group aggregation
            $profit = $revenue - $spend;
            $roi = $spend > 0 ? round(($revenue - $spend) / $spend, 1) . 'x' : '0x';
            
            return [
                'channel' => $channelName == 'Meta' ? 'Facebook' : $channelName, // Map Meta to Facebook for frontend icon
                'spend' => $spend,
                'revenue' => $revenue,
                'leads' => $leads,
                'impressions' => $impressions,
                'roi' => $roi,
                'profit' => $profit,
            ];
        });

        // Calculate totals for percentages
        $totalSpend = $channels->sum('spend');
        $totalRevenue = $channels->sum('revenue');

        $channels = $channels->map(function($item) use ($totalSpend, $totalRevenue) {
            $item['spendPct'] = $totalSpend > 0 ? round(($item['spend'] / $totalSpend) * 100) . '%' : '0%';
            $item['revenuePct'] = $totalRevenue > 0 ? round(($item['revenue'] / $totalRevenue) * 100) . '%' : '0%';
            return $item;
        })->values();

        // 3. Campaigns List (for Monthly Overview Table)
        $campaignsList = $campaigns->map(function($item) {
            $cpl = $item->leads > 0 ? round($item->spend / $item->leads, 2) : 0;
            $cpa = 0; 
            
            $p = $item->provider ? strtolower($item->provider) : ($item->source ? strtolower($item->source) : 'unknown');
            $channelName = ucfirst($p);
            if (str_contains($p, 'facebook') || str_contains($p, 'meta')) $channelName = 'Facebook';
            elseif (str_contains($p, 'google')) $channelName = 'Google';
            elseif (str_contains($p, 'whatsapp')) $channelName = 'WhatsApp';

            // Use stored values if available, otherwise calculate fallback
            $roi = $item->roi !== null ? $item->roi . 'x' : ($item->spend > 0 ? round(($item->revenue - $item->spend) / $item->spend, 2) . 'x' : '0x');
            $profit = $item->profit !== null ? $item->profit : ($item->revenue - $item->spend);

            return [
                'month' => $item->start_date ? $item->start_date->format('M') : 'N/A',
                'campaign' => $item->name,
                'channel' => $channelName,
                'spend' => $item->spend,
                'revenue' => $item->revenue,
                'leads' => $item->leads,
                'roi' => $roi,
                'profit' => $profit,
                'cpl' => '$' . $cpl,
                'cpa' => '$' . $cpa
            ];
        });

        return response()->json([
            'overview' => $overview,
            'channels' => $channels,
            'campaigns_list' => $campaignsList
        ]);
    }

    public function duration(Request $request)
    {
        $range = $request->input('range', '30d');
        $days = match ($range) {
            '7d' => 7,
            '90d' => 90,
            default => 30,
        };
        $startDate = Carbon::now()->subDays($days);

        // 1. KPIs
        // Avg Duration (days between start and end, or start and now if active)
        $avgDuration = Campaign::where('start_date', '>=', $startDate)
            ->selectRaw('AVG(DATEDIFF(COALESCE(end_date, NOW()), start_date)) as avg_days')
            ->value('avg_days') ?? 0;
            
        // Mock trend for now (real implementation would compare with previous period)
        $kpis = [
            [
                'title' => 'Avg. Campaign Duration',
                'value' => round($avgDuration) . ' Days',
                'change' => 5.2, // Mock change
                'trend' => [20, 21, 22, 23, 24, 24, 25, 24, 24, 23, 24, 24] // Mock trend
            ],
            // Add more KPIs as needed by frontend
        ];

        // 2. Performance Curve (Active campaigns over time)
        // This is complex to query efficiently in one go, simplifying to daily active count
        // Note: Real implementation needs a daily_metrics table. Using estimates/mocks for missing historical data.
        $curve = [];
        for ($i = $days; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            $dayLabel = Carbon::now()->subDays($i)->format('M d');
            
            // Count campaigns active on this date
            $count = Campaign::where('start_date', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', $date);
                })
                ->count();
            
            // Aggregate metrics for campaigns active on this date (simplified: using total averages)
            // In a real app, you'd query a daily_stats table.
            $dailyStats = Campaign::where('start_date', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', $date);
                })
                ->selectRaw('AVG(revenue/NULLIF(spend,0)) as avg_roas, AVG(spend/NULLIF(leads,0)) as avg_cpl')
                ->first();
                
            $curve[] = [
                'day' => $dayLabel, 
                'roas' => $dailyStats->avg_roas ? round($dailyStats->avg_roas, 2) : 0,
                'cpa' => $dailyStats->avg_cpl ? round($dailyStats->avg_cpl, 2) : 0,
                'ctr' => rand(1, 50) / 10, // Placeholder as we don't have daily CTR
                'value' => $count
            ];
        }

        // 3. Age Distribution (Histogram of durations)
        $campaigns = Campaign::where('start_date', '>=', $startDate)->get();
        $distribution = [
            '1-7 Days' => 0,
            '8-14 Days' => 0,
            '15-30 Days' => 0,
            '30+ Days' => 0,
        ];
        
        foreach ($campaigns as $campaign) {
            $end = $campaign->end_date ? Carbon::parse($campaign->end_date) : Carbon::now();
            $start = Carbon::parse($campaign->start_date);
            $diff = $start->diffInDays($end);
            
            if ($diff <= 7) $distribution['1-7 Days']++;
            elseif ($diff <= 14) $distribution['8-14 Days']++;
            elseif ($diff <= 30) $distribution['15-30 Days']++;
            else $distribution['30+ Days']++;
        }
        
        $ageDistribution = [];
        foreach ($distribution as $range => $count) {
            $ageDistribution[] = ['range' => $range, 'count' => $count];
        }

        // 4. Health (Active campaigns with metrics)
        $health = Campaign::where('status', 'active') // Assuming 'active' status exists
            ->get()
            ->map(function ($c) {
                $spend = $c->spend ?? 0;
                $revenue = $c->revenue ?? 0;
                $roas = $spend > 0 ? round($revenue / $spend, 2) : 0;
                
                // Duration
                $end = $c->end_date ? Carbon::parse($c->end_date) : Carbon::now();
                $start = Carbon::parse($c->start_date);
                $duration = $start->diffInDays($end);

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'platform' => $c->platform ?? 'Unknown',
                    'duration' => $duration,
                    'status' => $c->status,
                    'roas' => $roas,
                    'ctr_trend' => rand(-10, 10), // Mock trend for now
                    'spend' => $spend
                ];
            });

        return response()->json([
            'kpis' => $kpis,
            'curve' => $curve,
            'age_distribution' => $ageDistribution,
            'health' => $health
        ]);
    }

    public function summary(Request $request)
    {
        // Filter params
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $query = $request->input('query');

        $campaigns = Campaign::query();

        if ($startDate && $endDate) {
            $campaigns->whereBetween('start_date', [$startDate, $endDate]);
        }
        
        if ($query) {
            $campaigns->where('name', 'like', "%{$query}%");
        }

        $data = $campaigns->get()->map(function ($c) {
            $spend = $c->spend ?? 0;
            $revenue = $c->revenue ?? 0;
            $impressions = $c->impressions ?? 0;
            $clicks = $c->clicks ?? 0;
            $leads = $c->leads ?? 0;

            $ctr = $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0;
            $cpc = $clicks > 0 ? round($spend / $clicks, 2) : 0;
            $cpl = $leads > 0 ? round($spend / $leads, 2) : 0;
            $roi = $spend > 0 ? round($revenue / $spend, 2) : 0;
            $qualifiedPct = 0; // Need field for qualified leads to calculate this

            return [
                'id' => $c->id,
                'name' => $c->name,
                'platform' => $c->platform ?? 'Unknown',
                'spend' => $spend,
                'impressions' => $impressions,
                'clicks' => $clicks,
                'ctr' => $ctr,
                'cpc' => $cpc,
                'leads' => $leads,
                'cpl' => $cpl,
                'qualifiedPct' => $qualifiedPct,
                'roi' => $roi
            ];
        });

        return response()->json($data);
    }
}
