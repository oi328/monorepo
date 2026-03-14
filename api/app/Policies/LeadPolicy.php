<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LeadPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Lead $lead): bool
    {
        // Owner or assigned user
        if ($user->id === $lead->assigned_to || $user->id === $lead->created_by) {
            return true;
        }

        // Referral Supervisor
        if ($lead->referralUsers()->where('user_id', $user->id)->exists()) {
            return true;
        }

        // Hierarchy check (handled by existing logic/Gate or simple check here)
        // For now, allow if referral supervisor
        return $user->role === 'super-admin' || $user->can('view-all-leads'); 
    }

    /**
     * Determine whether the user can create actions for the lead.
     */
    public function createAction(User $user, Lead $lead): bool
    {
        // Referral Supervisor CANNOT create actions
        if ($lead->referralUsers()->where('user_id', $user->id)->exists() && $user->id !== $lead->assigned_to) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Lead $lead): bool
    {
        // Referral Supervisor CANNOT update lead
        if ($lead->referralUsers()->where('user_id', $user->id)->exists() && $user->id !== $lead->assigned_to) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Lead $lead): bool
    {
        // Referral Supervisor CANNOT delete lead
        if ($lead->referralUsers()->where('user_id', $user->id)->exists() && $user->id !== $lead->assigned_to) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can add comments.
     */
    public function addComment(User $user, Lead $lead): bool
    {
        // Referral Supervisor CAN add comments
        if ($lead->referralUsers()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return true;
    }
}
