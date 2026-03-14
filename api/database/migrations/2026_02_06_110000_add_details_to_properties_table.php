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
        Schema::table('properties', function (Blueprint $table) {
            if (!Schema::hasColumn('properties', 'tenant_id')) {
                $table->unsignedBigInteger('tenant_id')->index()->after('id');
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            }
            if (!Schema::hasColumn('properties', 'name')) {
                $table->string('name')->nullable();
            }
            if (!Schema::hasColumn('properties', 'ad_title')) {
                $table->string('ad_title')->nullable();
            }
            if (!Schema::hasColumn('properties', 'ad_title_ar')) {
                $table->string('ad_title_ar')->nullable();
            }
            if (!Schema::hasColumn('properties', 'project')) {
                $table->string('project')->nullable();
            }
            if (!Schema::hasColumn('properties', 'category')) {
                $table->string('category')->nullable();
            }
            if (!Schema::hasColumn('properties', 'property_type')) {
                $table->string('property_type')->nullable();
            }
            if (!Schema::hasColumn('properties', 'unit_number')) {
                $table->string('unit_number')->nullable();
            }
            if (!Schema::hasColumn('properties', 'unit_code')) {
                $table->string('unit_code')->nullable();
            }
            if (!Schema::hasColumn('properties', 'bua')) {
                $table->decimal('bua', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'internal_area')) {
                $table->decimal('internal_area', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'external_area')) {
                $table->decimal('external_area', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'total_area')) {
                $table->decimal('total_area', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'bedrooms')) {
                $table->integer('bedrooms')->nullable();
            }
            if (!Schema::hasColumn('properties', 'bathrooms')) {
                $table->integer('bathrooms')->nullable();
            }
            if (!Schema::hasColumn('properties', 'rooms')) {
                $table->integer('rooms')->nullable();
            }
            if (!Schema::hasColumn('properties', 'floor')) {
                $table->integer('floor')->nullable();
            }
            if (!Schema::hasColumn('properties', 'finishing')) {
                $table->string('finishing')->nullable();
            }
            if (!Schema::hasColumn('properties', 'view')) {
                $table->string('view')->nullable();
            }
            if (!Schema::hasColumn('properties', 'purpose')) {
                $table->string('purpose')->nullable();
            }
            if (!Schema::hasColumn('properties', 'status')) {
                $table->string('status')->default('Available');
            }
            if (!Schema::hasColumn('properties', 'elevator')) {
                $table->boolean('elevator')->default(false);
            }
            if (!Schema::hasColumn('properties', 'owner_name')) {
                $table->string('owner_name')->nullable();
            }
            if (!Schema::hasColumn('properties', 'owner_mobile')) {
                $table->string('owner_mobile')->nullable();
            }
            if (!Schema::hasColumn('properties', 'rent_cost')) {
                $table->decimal('rent_cost', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'amenities')) {
                $table->json('amenities')->nullable();
            }
            if (!Schema::hasColumn('properties', 'description')) {
                $table->text('description')->nullable();
            }
            if (!Schema::hasColumn('properties', 'description_ar')) {
                $table->text('description_ar')->nullable();
            }
            if (!Schema::hasColumn('properties', 'images')) {
                $table->json('images')->nullable();
            }
            if (!Schema::hasColumn('properties', 'main_image')) {
                $table->string('main_image')->nullable();
            }
            if (!Schema::hasColumn('properties', 'video_url')) {
                $table->string('video_url')->nullable();
            }
            if (!Schema::hasColumn('properties', 'virtual_tour_url')) {
                $table->string('virtual_tour_url')->nullable();
            }
            if (!Schema::hasColumn('properties', 'floor_plans')) {
                $table->json('floor_plans')->nullable();
            }
            if (!Schema::hasColumn('properties', 'documents')) {
                $table->json('documents')->nullable();
            }
            if (!Schema::hasColumn('properties', 'address_ar')) {
                $table->string('address_ar')->nullable();
            }
            if (!Schema::hasColumn('properties', 'city')) {
                $table->string('city')->nullable();
            }
            if (!Schema::hasColumn('properties', 'location_url')) {
                $table->string('location_url')->nullable();
            }
            if (!Schema::hasColumn('properties', 'nearby')) {
                $table->json('nearby')->nullable();
            }
            if (!Schema::hasColumn('properties', 'discount')) {
                $table->decimal('discount', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'discount_type')) {
                $table->string('discount_type')->nullable();
            }
            if (!Schema::hasColumn('properties', 'reservation_amount')) {
                $table->decimal('reservation_amount', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'garage_amount')) {
                $table->decimal('garage_amount', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('properties', 'maintenance_amount')) {
                $table->decimal('maintenance_amount', 15, 2)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['tenant_id', 'name', 'ad_title', 'ad_title_ar', 'project', 'category', 'property_type', 'unit_number', 'unit_code', 'bua', 'internal_area', 'external_area', 'total_area', 'bedrooms', 'bathrooms', 'rooms', 'floor', 'finishing', 'view', 'purpose', 'status', 'elevator', 'owner_name', 'owner_mobile', 'rent_cost', 'amenities', 'description', 'description_ar', 'images', 'main_image', 'video_url', 'virtual_tour_url', 'floor_plans', 'documents', 'address_ar', 'city', 'location_url', 'nearby', 'discount', 'discount_type', 'reservation_amount', 'garage_amount', 'maintenance_amount']);
        });
    }
};
