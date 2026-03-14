<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'source' => $this->source,
            'budgetType' => $this->budget_type,
            'totalBudget' => $this->total_budget,
            'dailyBudget' => $this->daily_budget,
            'lifetimeBudget' => $this->lifetime_budget,
            'currency' => $this->currency,
            'startDate' => $this->start_date,
            'endDate' => $this->end_date,
            'status' => $this->status,
            'landingPage' => $this->landing_page,
            'notes' => $this->notes,
            'audience' => $this->audience,
            'createdBy' => $this->created_by,
            'tenantId' => $this->tenant_id,
            'metaData' => $this->meta_data,
            'objective' => $this->objective,
            'provider' => $this->provider,
            'adAccountId' => $this->ad_account_id,
            'impressions' => $this->impressions,
            'clicks' => $this->clicks,
            'leads' => method_exists($this->resource, 'leadsRelation') ? $this->resource->leadsRelation()->count() : ($this->leads ?? 0),
            'spend' => $this->spend,
            'revenue' => $this->revenue,
            'cpl' => $this->cpl,
            'cpa' => $this->cpa,
            'cpd' => $this->start_date ? round($this->spend / max(1, $this->start_date->diffInDays($this->end_date ?? now())), 2) : 0,
            'conversionRate' => property_exists($this->resource, 'conversion_rate') ? $this->conversion_rate : ($this->clicks > 0 ? round(((method_exists($this->resource, 'leadsRelation') ? $this->resource->leadsRelation()->count() : ($this->leads ?? 0)) / $this->clicks) * 100, 2) : 0),
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }
}
