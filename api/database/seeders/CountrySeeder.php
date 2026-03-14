<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;
use App\Models\Tenant;

class CountrySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultCountries = [
            ['name_en' => 'Egypt', 'name_ar' => 'مصر', 'code' => '+20', 'status' => true],
            ['name_en' => 'Saudi Arabia', 'name_ar' => 'السعودية', 'code' => '+966', 'status' => true],
            ['name_en' => 'Emaraits', 'name_ar' => 'الامارات', 'code' => '+971', 'status' => true],
        ];

        // Seed for each tenant
        // Assuming Tenant model is the one managing tenants
        // If the system uses a different way to identify tenants (e.g. separate DBs), this might differ.
        // But based on BelongsToTenant trait, there is a Tenant model.
        
        if (class_exists(Tenant::class)) {
            $tenants = Tenant::all();
            
            foreach ($tenants as $tenant) {
                foreach ($defaultCountries as $country) {
                    // Check if exists to avoid duplicates
                    $exists = Country::withoutGlobalScope('tenant')
                        ->where('tenant_id', $tenant->id)
                        ->where('name_en', $country['name_en'])
                        ->exists();

                    if (!$exists) {
                        $data = $country;
                        $data['tenant_id'] = $tenant->id;
                        Country::create($data);
                    }
                }
            }
        }
    }
}
