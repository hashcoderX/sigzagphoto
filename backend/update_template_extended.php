<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\InvoiceTemplate;

// Get the template
$template = InvoiceTemplate::find(3);

if (!$template) {
    echo "Template not found!\n";
    exit(1);
}

$currentElements = $template->elements ?? [];

// New elements to add
$newElements = [
    // Customer details section
    [
        'id' => 'element-customer-company',
        'type' => 'text',
        'content' => 'Company: {{customer_company}}',
        'x' => 50,
        'y' => 120,
        'width' => 250,
        'height' => 25,
        'fontSize' => 12,
        'color' => '#666666',
        'textAlign' => 'left',
        'scale' => 1
    ],
    [
        'id' => 'element-customer-address',
        'type' => 'text',
        'content' => 'Address: {{customer_address}}',
        'x' => 50,
        'y' => 145,
        'width' => 300,
        'height' => 40,
        'fontSize' => 12,
        'color' => '#666666',
        'textAlign' => 'left',
        'scale' => 1
    ],
    [
        'id' => 'element-customer-phone',
        'type' => 'text',
        'content' => 'Phone: {{customer_phone}}',
        'x' => 50,
        'y' => 190,
        'width' => 200,
        'height' => 25,
        'fontSize' => 12,
        'color' => '#666666',
        'textAlign' => 'left',
        'scale' => 1
    ],
    [
        'id' => 'element-customer-email',
        'type' => 'text',
        'content' => 'Email: {{customer_email}}',
        'x' => 260,
        'y' => 190,
        'width' => 250,
        'height' => 25,
        'fontSize' => 12,
        'color' => '#666666',
        'textAlign' => 'left',
        'scale' => 1
    ],
    // Booking details section
    [
        'id' => 'element-booking-location',
        'type' => 'text',
        'content' => 'Location: {{booking_location}}',
        'x' => 50,
        'y' => 230,
        'width' => 300,
        'height' => 25,
        'fontSize' => 12,
        'color' => '#333333',
        'textAlign' => 'left',
        'scale' => 1
    ],
    [
        'id' => 'element-booking-status',
        'type' => 'text',
        'content' => 'Status: {{booking_status}}',
        'x' => 360,
        'y' => 230,
        'width' => 150,
        'height' => 25,
        'fontSize' => 12,
        'color' => '#333333',
        'textAlign' => 'left',
        'scale' => 1
    ],
    // Invoice financial details
    [
        'id' => 'element-paid-amount',
        'type' => 'text',
        'content' => 'Paid Amount: {{paid_amount}} {{currency}}',
        'x' => 400,
        'y' => 420,
        'width' => 150,
        'height' => 25,
        'fontSize' => 14,
        'color' => '#000000',
        'textAlign' => 'right',
        'scale' => 1
    ],
    [
        'id' => 'element-outstanding-balance',
        'type' => 'text',
        'content' => 'Outstanding: {{outstanding_balance}} {{currency}}',
        'x' => 400,
        'y' => 445,
        'width' => 150,
        'height' => 25,
        'fontSize' => 14,
        'color' => '#000000',
        'textAlign' => 'right',
        'scale' => 1
    ],
    // Payment history table
    [
        'id' => 'element-payment-history',
        'type' => 'table',
        'content' => 'payment_history',
        'x' => 50,
        'y' => 480,
        'width' => 500,
        'height' => 150,
        'scale' => 1
    ]
];

// Add new elements to existing ones
$updatedElements = array_merge($currentElements, $newElements);

// Update the template
$template->elements = $updatedElements;
$template->save();

echo "Template updated successfully with " . count($newElements) . " new elements!\n";
echo "Total elements now: " . count($updatedElements) . "\n";