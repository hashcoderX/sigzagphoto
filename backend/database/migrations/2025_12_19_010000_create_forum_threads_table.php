<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('forum_threads', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('body');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('replies_count')->default(0);
            $table->timestamp('last_post_at')->nullable();
            $table->timestamps();
            $table->index(['last_post_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_threads');
    }
};
