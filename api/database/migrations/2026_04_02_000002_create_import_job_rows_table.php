<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_job_rows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_id');
            $table->unsignedInteger('row_number')->default(0); // 1-based from file
            $table->string('status', 50); // success | failed | duplicate | skipped

            $table->string('reason_code', 100)->nullable();
            $table->text('reason_message')->nullable();

            $table->json('raw_data')->nullable();
            $table->json('normalized_data')->nullable();
            $table->json('warnings')->nullable(); // array of {code,message}

            $table->string('entity_type', 100)->nullable(); // e.g. leads
            $table->unsignedBigInteger('created_record_id')->nullable();
            $table->unsignedBigInteger('duplicate_of_id')->nullable();

            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('import_jobs')->onDelete('cascade');
            $table->index(['job_id', 'status']);
            $table->index(['job_id', 'row_number']);
            $table->index(['created_record_id']);
            $table->index(['duplicate_of_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_job_rows');
    }
};

