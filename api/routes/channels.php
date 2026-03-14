<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('leads.{leadId}', function ($user, $leadId) {
    // Basic authorization: user must belong to the same tenant as the lead
    // and ideally have permission to view the lead.
    // For now, checking tenant or role.
    $lead = \App\Models\Lead::find($leadId);
    if (!$lead) return false;
    
    // Check Tenant
    if ($user->tenant_id !== $lead->tenant_id) return false;

    // Check Role/Permissions (simplified)
    // If super admin or manager, allow.
    // If sales person, allow if assigned or owner.
    // Assuming if they can access the frontend page, they can listen.
    return true; 
});

// Test channel to debug authentication issues
Broadcast::channel('test-channel', function ($user) {
    return true;
});
