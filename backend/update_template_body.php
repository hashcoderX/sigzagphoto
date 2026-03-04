<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\InvoiceTemplate;

try {
    $template = InvoiceTemplate::find(3);

    if (!$template) {
        echo "Template not found\n";
        exit(1);
    }

    // Add more elements to the template
    $newElements = [
        [
            "id" => "element-invoice-number",
            "type" => "text",
            "content" => "{{invoice_number}}",
            "x" => 125,
            "y" => 150,
            "width" => 200,
            "height" => 30,
            "fontSize" => 14,
            "color" => "#000000",
            "textAlign" => "left",
            "scale" => 1
        ],
        [
            "id" => "element-invoice-date",
            "type" => "text",
            "content" => "{{invoice_date}}",
            "x" => 125,
            "y" => 180,
            "width" => 200,
            "height" => 30,
            "fontSize" => 14,
            "color" => "#000000",
            "textAlign" => "left",
            "scale" => 1
        ],
        [
            "id" => "element-total-amount",
            "type" => "text",
            "content" => "Total: {{total_amount}} {{currency}}",
            "x" => 400,
            "y" => 400,
            "width" => 200,
            "height" => 30,
            "fontSize" => 16,
            "color" => "#000000",
            "textAlign" => "right",
            "scale" => 1
        ],
        [
            "id" => "element-invoice-items",
            "type" => "table",
            "content" => "invoice_items",
            "x" => 50,
            "y" => 220,
            "width" => 500,
            "height" => 150,
            "scale" => 1
        ]
    ];

    // Get current elements and add new ones
    $currentElements = $template->elements ?? [];
    $updatedElements = array_merge($currentElements, $newElements);

    // Update the template
    $template->update([
        'elements' => $updatedElements
    ]);

    echo "Template updated successfully with additional placeholders\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}