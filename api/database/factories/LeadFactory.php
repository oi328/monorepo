<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class LeadFactory extends Factory
{
    protected $model = Lead::class;

    public function definition()
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'phone' => $this->faker->phoneNumber,
            'company' => $this->faker->company,
            'status' => 'new',
            'source' => 'web',
            'stage' => 'lead',
            'priority' => 'medium',
        ];
    }
}
