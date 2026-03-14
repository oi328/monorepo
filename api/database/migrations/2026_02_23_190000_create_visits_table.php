<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('lead_id')->nullable();
            $table->unsignedBigInteger('customer_id')->nullable();

            $table->string('type')->nullable();

            $table->unsignedBigInteger('sales_person_id')->nullable();
            $table->string('sales_person_name')->nullable();
            $table->string('customer_name')->nullable();

            $table->timestamp('check_in_at')->nullable();
            $table->timestamp('check_out_at')->nullable();

            $table->decimal('check_in_lat', 10, 7)->nullable();
            $table->decimal('check_in_lng', 10, 7)->nullable();
            $table->string('check_in_address')->nullable();

            $table->decimal('check_out_lat', 10, 7)->nullable();
            $table->decimal('check_out_lng', 10, 7)->nullable();
            $table->string('check_out_address')->nullable();

            $table->string('status')->default('pending');

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->json('meta_data')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index('lead_id');
            $table->index('customer_id');
            $table->index('sales_person_id');
            $table->index('status');
            $table->index('check_in_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};

