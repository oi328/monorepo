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
        Schema::table('fields', function (Blueprint $table) {
            // 1. Drop Foreign Key to allow index manipulation
            $table->dropForeign(['entity_id']);
            
            // 2. Drop old unique constraint
            $table->dropUnique(['entity_id', 'key']);

            // 3. Re-add Foreign Key
            $table->foreign('entity_id')->references('id')->on('entities')->onDelete('cascade');

            // 4. Add new unique constraint
            $table->unique(['tenant_id', 'entity_id', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fields', function (Blueprint $table) {
            $table->dropForeign(['entity_id']);
            $table->dropUnique(['tenant_id', 'entity_id', 'key']);

            $table->foreign('entity_id')->references('id')->on('entities')->onDelete('cascade');
            $table->unique(['entity_id', 'key']);
        });
    }
};
