<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('recycle_leads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('original_lead_id')->nullable()->index();
            $table->longText('lead_data');
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->timestamp('deleted_at');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('recycle_leads');
    }
};
