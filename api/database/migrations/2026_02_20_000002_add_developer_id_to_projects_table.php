<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedBigInteger('developer_id')->nullable()->after('developer');
            $table->foreign('developer_id')->references('id')->on('developers')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['developer_id']);
            $table->dropColumn('developer_id');
        });
    }
};
