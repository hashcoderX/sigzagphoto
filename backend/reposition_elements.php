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

$elements = $template->elements;

// Define new positions with proper spacing
$newPositions = [
    // Logo stays at top
    'element-1765084455967' => ['x' => 164, 'y' => 50],

    // Customer information section
    'element-1765185850703' => ['x' => 125, 'y' => 120], // customer_name
    'element-customer-company' => ['x' => 50, 'y' => 150],
    'element-customer-address' => ['x' => 50, 'y' => 175],
    'element-customer-phone' => ['x' => 50, 'y' => 210],
    'element-customer-email' => ['x' => 260, 'y' => 210],

    // Invoice details
    'element-invoice-number' => ['x' => 400, 'y' => 120],
    'element-invoice-date' => ['x' => 400, 'y' => 150],

    // Booking details
    'element-booking-location' => ['x' => 50, 'y' => 250],
    'element-booking-status' => ['x' => 300, 'y' => 250],

    // Invoice items table
    'element-invoice-items' => ['x' => 50, 'y' => 290],

    // Financial summary
    'element-total-amount' => ['x' => 400, 'y' => 480],
    'element-paid-amount' => ['x' => 400, 'y' => 510],
    'element-outstanding-balance' => ['x' => 400, 'y' => 535],

    // Payment history table
    'element-payment-history' => ['x' => 50, 'y' => 570],
];

// Update positions
foreach ($elements as &$element) {
    $id = $element['id'];
    if (isset($newPositions[$id])) {
        $element['x'] = $newPositions[$id]['x'];
        $element['y'] = $newPositions[$id]['y'];
    }
}

$template->elements = $elements;
$template->save();

echo "Template elements repositioned successfully!\n";