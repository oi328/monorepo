<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LandingPageResource extends JsonResource
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
            'name' => $this->title, // Frontend expects 'name'
            'title' => $this->title,
            'slug' => $this->slug,
            'url' => null, // Let frontend construct the URL using window.location.origin
            'description' => $this->description,
            'source' => $this->source,
            'campaign' => $this->campaign ? $this->campaign->name : null,
            'campaignId' => $this->campaign_id,
            'email' => $this->email,
            'phone' => $this->phone,
            'theme' => $this->theme,
            'logo' => $this->logo,
            'cover' => $this->cover,
            'facebook' => $this->facebook,
            'instagram' => $this->instagram,
            'twitter' => $this->twitter,
            'linkedin' => $this->linkedin,
            'headerScript' => $this->header_script,
            'headerScriptEnabled' => (bool)$this->header_script_enabled,
            'bodyScript' => $this->body_script,
            'bodyScriptEnabled' => (bool)$this->body_script_enabled,
            'pixelId' => $this->pixel_id,
            'isPixelEnabled' => (bool)$this->is_pixel_enabled,
            'gtmId' => $this->gtm_id,
            'isGtmEnabled' => (bool)$this->is_gtm_enabled,
            'media' => $this->meta_data['media'] ?? [],
            'property' => $this->meta_data['property'] ?? [], // If property details are stored here
            'visitors' => $this->visits,
            'leads' => $this->conversions,
            'conversionRate' => $this->visits > 0 ? round(($this->conversions / $this->visits) * 100, 2) : 0,
            'isActive' => (bool)$this->is_active,
            'createdBy' => $this->created_by,
            'createdAt' => $this->created_at,
        ];
    }
}
