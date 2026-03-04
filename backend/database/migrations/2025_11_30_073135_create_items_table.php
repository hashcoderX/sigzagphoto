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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('code')->unique(); // Unique item code
            $table->string('name'); // Item name (itemname)
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->nullable(); // Item price
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id']);
            $table->index(['code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
