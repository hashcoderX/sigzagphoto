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
        Schema::table('job_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('job_cards', 'advance_payment')) {
                $table->decimal('advance_payment', 10, 2)->nullable()->after('confirmed_amount');
            }
            if (!Schema::hasColumn('job_cards', 'transport_charges')) {
                $table->decimal('transport_charges', 10, 2)->nullable()->after('discount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            if (Schema::hasColumn('job_cards', 'advance_payment')) {
                $table->dropColumn('advance_payment');
            }
            if (Schema::hasColumn('job_cards', 'transport_charges')) {
                $table->dropColumn('transport_charges');
            }
        });
    }
};
