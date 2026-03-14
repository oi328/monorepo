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
        Schema::create('fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('entities')->onDelete('cascade');
            $table->string('key');
            $table->string('label_en');
            $table->string('label_ar');
            $table->string('placeholder_en')->nullable();
            $table->string('placeholder_ar')->nullable();
            $table->string('type'); // text, number, email, date, select, checkbox, textarea
            $table->boolean('required')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('can_filter')->default(false);
            $table->boolean('is_landing_page')->default(false);
            $table->boolean('show_my_lead')->default(true);
            $table->boolean('show_sales')->default(true);
            $table->boolean('show_manager')->default(true);
            $table->boolean('is_exportable')->default(true);
            $table->json('options')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Unique constraint to prevent duplicate keys per entity
            $table->unique(['entity_id', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fields');
    }
};
