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

// Remove duplicate elements (keep the first occurrence of each unique ID)
$uniqueElements = [];
$seenIds = [];

foreach ($elements as $element) {
    $id = $element['id'];
    if (!in_array($id, $seenIds)) {
        $uniqueElements[] = $element;
        $seenIds[] = $id;
    }
}

$template->elements = $uniqueElements;
$template->save();

echo "Duplicate elements removed. Total elements now: " . count($uniqueElements) . "\n";