<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Property;
use App\Models\Unit;
use Carbon\Carbon;

class ExpireReservedUnits extends Command
{
    protected $signature = 'inventory:expire-reservations';
    protected $description = 'Expire reserved properties/units based on reserved_expires_at and return them to available';

    public function handle()
    {
        $now = Carbon::now();

        $expiredProps = Property::withoutGlobalScope('tenant')
            ->whereIn('status', ['Reserved', 'reserved'])
            ->whereNotNull('reserved_expires_at')
            ->where('reserved_expires_at', '<=', $now)
            ->get();

        $propsCount = 0;
        foreach ($expiredProps as $p) {
            $p->status = 'Available';
            $p->reserved_at = null;
            $p->reserved_expires_at = null;
            $p->reserved_lead_id = null;
            $p->saveQuietly();
            $propsCount++;
        }

        $expiredUnits = Unit::withoutGlobalScope('tenant')
            ->whereIn('status', ['Reserved', 'reserved'])
            ->whereNotNull('reserved_expires_at')
            ->where('reserved_expires_at', '<=', $now)
            ->get();

        $unitsCount = 0;
        foreach ($expiredUnits as $u) {
            $u->status = 'available';
            $u->reserved_at = null;
            $u->reserved_expires_at = null;
            $u->reserved_lead_id = null;
            $u->saveQuietly();
            $unitsCount++;
        }

        $this->info("Expired reservations: properties={$propsCount}, units={$unitsCount}");
        return 0;
    }
}

