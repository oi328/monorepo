<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Lead;

class DemoLeadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Lead::create([
            'name' => 'النصري الطحان عكي الحداور',
            'company' => 'النصري الطحان عكي الحداور',
            'email' => 'client@example.com',
            'phone' => '+966500000000',
            'location' => 'Riyadh, Saudi Arabia',
            'source' => 'whats app',
            'stage' => 'New',
            'status' => 'Active',
            'priority' => 'High',
            'assigned_to' => null,
            'created_by' => 1, // Assuming user ID 1 exists
            'notes' => 'This is a demo lead for testing.',
            'estimated_value' => 50000.00,
        ]);
    }
}
