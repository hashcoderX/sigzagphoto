<?php

require_once 'bootstrap/app.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Invoice;

$invoice = Invoice::with(['customer', 'booking', 'items', 'user', 'payments'])->where('id', 1)->first();

if ($invoice) {
    echo "Invoice found\n";
    if ($invoice->booking) {
        echo "Booking data exists:\n";
        print_r($invoice->booking->toArray());
    } else {
        echo "No booking data\n";
    }
} else {
    echo "No invoice found\n";
}