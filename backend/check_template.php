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

echo "Template elements after cleanup:\n";
foreach ($template->elements as $element) {
    echo "ID: {$element['id']} - {$element['content']} (y={$element['y']})\n";
}

echo "\nTotal elements: " . count($template->elements) . "\n";