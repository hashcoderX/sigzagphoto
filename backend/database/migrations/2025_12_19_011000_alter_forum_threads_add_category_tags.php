<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('forum_threads', function (Blueprint $table) {
            $table->string('category')->nullable()->after('title');
            $table->text('tags')->nullable()->after('category');
            $table->index(['category']);
        });
    }

    public function down(): void
    {
        Schema::table('forum_threads', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropColumn(['category','tags']);
        });
    }
};
