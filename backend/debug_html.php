<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\InvoiceTemplate;
use App\Models\Invoice;
use Illuminate\Http\Request;

// Create a mock request
$request = new Request();
$request->merge(['invoice_id' => 26]);

// Get the controller
$controller = new \App\Http\Controllers\Admin\InvoiceTemplateController();

// Get the template
$template = InvoiceTemplate::find(3);

// Create a mock user for the request
$user = \App\Models\User::find(22);
$request->setUserResolver(function () use ($user) {
    return $user;
});

// Get the HTML output for logging
$reflectionHtml = new ReflectionClass($controller);
$methodHtml = $reflectionHtml->getMethod('renderTemplateToHtml');
$methodHtml->setAccessible(true);

// Get invoice
$invoice = \App\Models\Invoice::with(['customer', 'booking', 'items', 'user', 'payments'])
    ->where('id', 26)
    ->where('user_id', 22)
    ->first();

// Calculate paid amount
$paidOnInvoice = \App\Models\Payment::where('invoice_id', $invoice->id)
    ->where('status', 'paid')
    ->sum('amount');

$html = $methodHtml->invoke($controller, $template, $invoice, $paidOnInvoice);

// Save HTML for inspection
file_put_contents('debug_invoice.html', $html);

echo "HTML saved to debug_invoice.html\n";
echo "First 1000 characters of HTML:\n";
echo substr($html, 0, 1000) . "\n";