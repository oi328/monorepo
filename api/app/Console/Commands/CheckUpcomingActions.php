<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeadAction;
use App\Models\User;
use App\Notifications\UpcomingActionReminder;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class CheckUpcomingActions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'actions:check-upcoming';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for upcoming actions (30m) and notify users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for upcoming actions...');

        $now = Carbon::now();
        $today = $now->toDateString();
        $timeNow = $now->toTimeString();
        
        // Fetch actions that are pending for today
        // We will filter time in PHP to avoid JSON string comparison issues
        $actions = LeadAction::with(['lead', 'user'])
            ->withoutGlobalScope('tenant')
            ->where('details->status', 'pending')
            ->where('details->date', $today)
             ->get();
 
         $this->info("Found " . $actions->count() . " pending actions for today.");

         foreach ($actions as $action) {
             $details = $action->details;
             if (empty($details['time'])) {
                 continue;
             }
 
             try {
                $actionTime = Carbon::createFromFormat('Y-m-d H:i', $today . ' ' . $details['time'], config('app.timezone'));
            } catch (\Exception $e) {
                // Try H:i:s if H:i fails
                try {
                     $actionTime = Carbon::createFromFormat('Y-m-d H:i:s', $today . ' ' . $details['time'], config('app.timezone'));
                } catch (\Exception $ex) {
                    continue;
                }
            }
            
            // Check if action is within the next 30 minutes
            // We want to notify if it's upcoming in [now, now + 30m]
            // We should NOT notify if it's already past (that's delayed)
            
            $limit = $now->copy()->addMinutes(30);
            
            $this->info("Checking action {$action->id}: {$actionTime} (Limit: {$limit})");

            if ($actionTime->lessThan($now)) {
                 // Already past, not upcoming
                 $this->info("Action {$action->id} is in the past.");
                 continue;
            }

            if ($actionTime->greaterThan($limit)) {
                // Too far in future
                $this->info("Action {$action->id} is too far in future.");
                continue;
            }
 
             $cacheKey = "notified_upcoming_{$action->id}";
            
            if (Cache::has($cacheKey)) {
                $this->info("Action {$action->id} already notified (Cached).");
                continue;
            }

            // Send Notification
            // Assigned user (user_id) or creator (created_by)
            $user = $action->user ?? User::find($action->user_id); 
            
            if (!$user) {
                $this->info("Action {$action->id} has no user assigned.");
            }
            
            if ($user) {
                try {
                    $user->notify(new UpcomingActionReminder($action));
                    $this->info("Sent upcoming notification for action #{$action->id}");
                    
                    // Cache for 60 mins to avoid duplicate
                    Cache::put($cacheKey, true, 60 * 60);
                } catch (\Exception $e) {
                    $this->error("Failed to notify user {$user->id}: " . $e->getMessage());
                }
            }
        }
        
        return 0;
    }
}
