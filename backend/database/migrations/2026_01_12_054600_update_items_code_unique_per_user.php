<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            // Drop global unique on code if it exists
            try {
                $table->dropUnique('items_code_unique');
            } catch (\Throwable $e) {
                // Index may not exist or already dropped; proceed safely
            }
            // Add composite unique per user
            $table->unique(['user_id', 'code'], 'items_user_id_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            // Drop composite unique
            try {
                $table->dropUnique('items_user_id_code_unique');
            } catch (\Throwable $e) {
                // Ignore if not present
            }
            // Restore global unique on code
            $table->unique('code', 'items_code_unique');
        });
    }
};
