<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;
use App\Models\Lead;
use App\Models\Order;
use App\Models\SalesInvoice;

class Campaign extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'name',
        'source',
        'budget_type',
        'total_budget',
        'currency',
        'start_date',
        'end_date',
        'status',
        'landing_page',
        'notes',
        'audience',
        'created_by',
        'tenant_id',
        'meta_data',
        // Meta Integration Fields
        'meta_id',
        'google_id', // Added for Google Ads
        'objective',
        'daily_budget',
        'lifetime_budget',
        'provider',
        'ad_account_id',
        // Metrics
        'impressions',
        'clicks',
        'leads',
        'spend',
        'revenue',
        'roi',
        'profit',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'total_budget' => 'decimal:2',
        'daily_budget' => 'decimal:2',
        'lifetime_budget' => 'decimal:2',
        'spend' => 'decimal:2',
        'revenue' => 'decimal:2',
        'roi' => 'decimal:2',
        'profit' => 'decimal:2',
        'meta_data' => 'array',
    ];

    public function insights()
    {
        return $this->hasMany(CampaignInsight::class, 'meta_campaign_id', 'meta_id');
    }

    public function leadsRelation()
    {
        return $this->hasMany(Lead::class, 'campaign_id');
    }

    public function getCalculatedLeadsAttribute()
    {
        return $this->leadsRelation()->count();
    }

    public function getCplAttribute()
    {
        $leadsCount = $this->calculated_leads;
        if ($leadsCount <= 0) {
            return 0;
        }
        return round($this->spend / $leadsCount, 2);
    }

    public function getConversionRateAttribute()
    {
        $clicks = (int) ($this->clicks ?? 0);
        $leadsCount = $this->calculated_leads;
        if ($clicks <= 0) {
            return 0;
        }
        return round(($leadsCount / $clicks) * 100, 2);
    }

    public function getCpaActionsCountAttribute()
    {
        $tenantId = $this->tenant_id;
        $campaignId = $this->id;

        $invoiceDirect = SalesInvoice::where('tenant_id', $tenantId)
            ->whereIn('payment_status', ['Paid', 'paid', 'Complete', 'Completed'])
            ->where('meta_data->campaign_id', $campaignId)
            ->count();

        $orderDirect = Order::where('tenant_id', $tenantId)
            ->whereIn('status', ['confirmed', 'Confirmed', 'completed', 'Completed', 'delivered', 'Delivered', 'shipped', 'Shipped'])
            ->where('meta_data->campaign_id', $campaignId)
            ->count();

        $leadIds = Lead::where('tenant_id', $tenantId)
            ->where('campaign_id', $campaignId)
            ->pluck('id')
            ->all();

        $invoiceViaLead = 0;
        $orderViaLead = 0;

        if (!empty($leadIds)) {
            $invoiceViaLead = SalesInvoice::where('tenant_id', $tenantId)
                ->whereIn('payment_status', ['Paid', 'paid', 'Complete', 'Completed'])
                ->whereIn('meta_data->lead_id', $leadIds)
                ->count();

            $orderViaLead = Order::where('tenant_id', $tenantId)
                ->whereIn('status', ['confirmed', 'Confirmed', 'completed', 'Completed', 'delivered', 'Delivered', 'shipped', 'Shipped'])
                ->whereIn('meta_data->lead_id', $leadIds)
                ->count();
        }

        return $invoiceDirect + $orderDirect + $invoiceViaLead + $orderViaLead;
    }

    public function getCpaAttribute()
    {
        $actions = $this->cpa_actions_count;
        if ($actions <= 0) {
            return 0;
        }
        return round($this->spend / $actions, 2);
    }
}
