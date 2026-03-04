<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Invoice;

// Get the invoice
$invoice = Invoice::with(['customer', 'booking', 'items', 'user', 'payments'])->find(25);

if (!$invoice) {
    echo "Invoice not found!\n";
    exit(1);
}

// Calculate paid amount on this invoice
$paidOnInvoice = \App\Models\Payment::where('invoice_id', $invoice->id)
    ->where('status', 'paid')
    ->sum('amount');

echo "Invoice ID: {$invoice->id}\n";
echo "Invoice Number: {$invoice->number}\n";
echo "Customer Name: " . (isset($invoice->customer->name) ? $invoice->customer->name : 'N/A') . "\n";
echo "Customer Company: " . (isset($invoice->customer->company) ? $invoice->customer->company : 'N/A') . "\n";
echo "Customer Address: " . (isset($invoice->customer->address) ? $invoice->customer->address : 'N/A') . "\n";
echo "Customer Phone: " . (isset($invoice->customer->phone) ? $invoice->customer->phone : 'N/A') . "\n";
echo "Customer Email: " . (isset($invoice->customer->email) ? $invoice->customer->email : 'N/A') . "\n";
echo "Booking ID: " . (isset($invoice->booking->id) ? $invoice->booking->id : 'N/A') . "\n";
echo "Booking Location: " . (isset($invoice->booking->location) ? $invoice->booking->location : 'N/A') . "\n";
echo "Booking Status: " . ($invoice->booking ? ucfirst($invoice->booking->status) : 'N/A') . "\n";
echo "Paid on Invoice: {$paidOnInvoice}\n";
echo "Total Amount: {$invoice->amount}\n";
echo "Currency: " . (isset($invoice->user->currency) ? $invoice->user->currency : 'USD') . "\n";

// Test replacePlaceholders function
function replacePlaceholders(string $content, $invoice, $paidOnInvoice = 0): string
{
    $currency = isset($invoice->user->currency) ? $invoice->user->currency : 'USD';
    $advancePayment = (float)(isset($invoice->advance_payment) ? $invoice->advance_payment : 0);
    $totalPaid = $advancePayment + $paidOnInvoice;
    $outstanding = max(0, (float)(isset($invoice->amount) ? $invoice->amount : 0) - $totalPaid);

    $placeholders = [
        '{{invoice_number}}' => isset($invoice->number) ? $invoice->number : '',
        '{{invoice_date}}' => $invoice->issued_at ? $invoice->issued_at->format('M d, Y') : '',
        '{{due_date}}' => $invoice->due_at ? $invoice->due_at->format('M d, Y') : '',
        '{{invoice_status}}' => ucfirst(isset($invoice->status) ? $invoice->status : ''),

        // Customer details
        '{{customer_name}}' => isset($invoice->customer->name) ? $invoice->customer->name : '',
        '{{customer_company}}' => isset($invoice->customer->company) ? $invoice->customer->company : '',
        '{{customer_address}}' => isset($invoice->customer->address) ? $invoice->customer->address : '',
        '{{customer_phone}}' => isset($invoice->customer->phone) ? $invoice->customer->phone : '',
        '{{customer_email}}' => isset($invoice->customer->email) ? $invoice->customer->email : '',
        '{{customer_whatsapp}}' => isset($invoice->customer->whatsapp) ? $invoice->customer->whatsapp : '',

        // Business details
        '{{business_name}}' => isset($invoice->user->name) ? $invoice->user->name : '',
        '{{business_address}}' => isset($invoice->user->address) ? $invoice->user->address : '',
        '{{business_phone}}' => isset($invoice->user->phone) ? $invoice->user->phone : '',
        '{{business_email}}' => isset($invoice->user->email) ? $invoice->user->email : '',
        '{{business_website}}' => isset($invoice->user->website) ? $invoice->user->website : '',

        // Financial details
        '{{total_amount}}' => number_format(isset($invoice->amount) ? $invoice->amount : 0, 2),
        '{{discount}}' => number_format(isset($invoice->discount) ? $invoice->discount : 0, 2),
        '{{advance_payment}}' => number_format($advancePayment, 2),
        '{{paid_amount}}' => number_format($paidOnInvoice, 2),
        '{{outstanding_balance}}' => number_format($outstanding, 2),
        '{{currency}}' => $currency,

        // Booking details
        '{{booking_id}}' => $invoice->booking ? $invoice->booking->id : '',
        '{{booking_location}}' => $invoice->booking ? $invoice->booking->location : '',
        '{{booking_status}}' => $invoice->booking ? ucfirst($invoice->booking->status) : '',
        '{{booking_notes}}' => $invoice->booking ? $invoice->booking->notes : '',
        '{{wedding_shoot_date}}' => $invoice->booking && $invoice->booking->wedding_shoot_date ? $invoice->booking->wedding_shoot_date->format('M d, Y') : '',
        '{{preshoot_date}}' => $invoice->booking && $invoice->booking->preshoot_date ? $invoice->booking->preshoot_date->format('M d, Y') : '',
        '{{homecoming_date}}' => $invoice->booking && $invoice->booking->homecoming_date ? $invoice->booking->homecoming_date->format('M d, Y') : '',
        '{{function_date}}' => $invoice->booking && $invoice->booking->function_date ? $invoice->booking->function_date->format('M d, Y') : '',
        '{{event_covering_date}}' => $invoice->booking && $invoice->booking->event_covering_date ? $invoice->booking->event_covering_date->format('M d, Y') : '',
        '{{custom_plan_date}}' => $invoice->booking && $invoice->booking->custom_plan_date ? $invoice->booking->custom_plan_date->format('M d, Y') : '',
        '{{wedding_shoot_location}}' => $invoice->booking ? $invoice->booking->wedding_shoot_location : '',
        '{{preshoot_location}}' => $invoice->booking ? $invoice->booking->preshoot_location : '',
        '{{homecoming_location}}' => $invoice->booking ? $invoice->booking->homecoming_location : '',
        '{{function_location}}' => $invoice->booking ? $invoice->booking->function_location : '',
        '{{event_covering_location}}' => $invoice->booking ? $invoice->booking->event_covering_location : '',
        '{{custom_plan_location}}' => $invoice->booking ? $invoice->booking->custom_plan_location : '',
        '{{booking_advance_payment}}' => $invoice->booking ? number_format(isset($invoice->booking->advance_payment) ? $invoice->booking->advance_payment : 0, 2) : '0.00',
        '{{transport_charges}}' => $invoice->booking ? number_format(isset($invoice->booking->transport_charges) ? $invoice->booking->transport_charges : 0, 2) : '0.00',
    ];

    return str_replace(array_keys($placeholders), array_values($placeholders), $content);
}

// Test some placeholders
$testContents = [
    '{{customer_name}}',
    '{{customer_company}}',
    '{{customer_address}}',
    '{{customer_phone}}',
    '{{customer_email}}',
    '{{invoice_number}}',
    '{{invoice_date}}',
    '{{total_amount}}',
    '{{paid_amount}}',
    '{{outstanding_balance}}',
    '{{booking_location}}',
    '{{booking_status}}',
    'Company: {{customer_company}}',
    'Total: {{total_amount}} {{currency}}',
];

echo "\n--- Testing Placeholder Replacement ---\n";
foreach ($testContents as $content) {
    $replaced = replacePlaceholders($content, $invoice, $paidOnInvoice);
    echo "Original: '$content'\n";
    echo "Replaced: '$replaced'\n";
    echo "---\n";
}