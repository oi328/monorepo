<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Entity;

class EntitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $entities = ['leads', 'customers', 'items', 'brokers', 'properties'];

        foreach ($entities as $key) {
            Entity::firstOrCreate(['key' => $key]);
        }
    }
}
