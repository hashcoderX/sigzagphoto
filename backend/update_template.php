<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$template = App\Models\InvoiceTemplate::find(3);
if ($template) {
    $elements = $template->elements;
    if (isset($elements[1])) {
        $elements[1]['content'] = '{{customer_name}}';
        $template->elements = $elements;
        $template->save();
        echo "Template updated successfully\n";
    } else {
        echo "Element not found\n";
    }
} else {
    echo "Template not found\n";
}