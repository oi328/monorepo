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
        Schema::table('leads', function (Blueprint $table) {
            // Check if columns exist before adding
            if (!Schema::hasColumn('leads', 'project_id')) {
                $table->unsignedBigInteger('project_id')->nullable()->after('campaign');
                // We use constraints if possible, but projects table might be tenant specific
                // and we need to be careful with strict FKs if tables are created dynamically or shared.
                // Assuming standard table structure:
                // $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
            }

            if (!Schema::hasColumn('leads', 'item_id')) {
                $table->unsignedBigInteger('item_id')->nullable()->after('project_id');
                // $table->foreign('item_id')->references('id')->on('items')->onDelete('set null');
            }

            // Also adding string columns if we want to support legacy/simple usage without relations?
            // The user asked to "link it to database", which implies relations.
            // But AddNewLead.jsx sends 'project' name string.
            // We should support storing the name if the ID is not available or for legacy support.
            if (!Schema::hasColumn('leads', 'project')) {
                $table->string('project')->nullable()->after('source'); 
                // Wait, 'project' might conflict if we wanted a relation method named 'project'.
                // But usually relation is 'project()' and column is 'project_id'.
                // The frontend sends 'project' as a string name. 
                // If the column 'project' does not exist (it wasn't in the original migration I read), 
                // we should add it or decide to drop it in favor of project_id.
                // Given the existing frontend code sends 'project' string, let's keep/add it for backward compatibility
                // but prioritize project_id for the new logic.
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (Schema::hasColumn('leads', 'project_id')) {
                $table->dropColumn('project_id');
            }
            if (Schema::hasColumn('leads', 'item_id')) {
                $table->dropColumn('item_id');
            }
            if (Schema::hasColumn('leads', 'project')) {
                $table->dropColumn('project');
            }
        });
    }
};
