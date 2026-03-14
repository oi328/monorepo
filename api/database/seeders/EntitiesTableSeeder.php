<?php

namespace Database\Seeders;

use App\Models\Entity;
use Illuminate\Database\Seeder;

class EntitiesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $entities = [
            'leads',
            'customers',
            'items',
            'brokers',
            'properties',
            'requests',
            'realEstateRequests',
        ];

        foreach ($entities as $key) {
            Entity::firstOrCreate(['key' => $key]);
        }
    }
}
