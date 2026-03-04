<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FooterRule;
use App\Models\InvoiceTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InvoiceTemplateController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        try {
            $query = InvoiceTemplate::where('user_id', $user->id)
                ->orderByDesc('updated_at');

            // For debugging, return all templates without pagination
            $safeDecode = function ($value, $default) {
                try {
                    if ($value === null || $value === '') return $default;
                    if (is_array($value)) return $value; // already decoded
                    if (is_string($value)) {
                        $decoded = json_decode($value, true);
                        return is_array($decoded) ? $decoded : $default;
                    }
                    return $default;
                } catch (\Throwable $t) {
                    return $default;
                }
            };

            $templates = $query->get()->map(function ($template) use ($safeDecode) {
                $template->elements = $safeDecode($template->elements, []);
                $template->margins = $safeDecode($template->margins, ['top' => 10, 'right' => 10, 'bottom' => 10, 'left' => 10]);
                return $template;
            });
            Log::info('Invoice templates loaded', ['count' => $templates->count(), 'user_id' => $user->id]);
            return $templates;
        } catch (\Exception $e) {
            Log::error('Error loading invoice templates', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'elements' => ['required', 'array'],
            'html_content' => ['nullable', 'string'],
            'page_width' => ['nullable', 'integer', 'min:100', 'max:2000'],
            'page_height' => ['nullable', 'integer', 'min:100', 'max:2000'],
            'background_color' => ['nullable', 'string', 'regex:/^#[a-fA-F0-9]{6}$/'],
            'paper_size' => ['nullable', 'string', 'in:A4,Letter,Legal,A3,Custom'],
            'margins' => ['nullable', 'array'],
            'margins.top' => ['nullable', 'integer', 'min:0', 'max:500'],
            'margins.right' => ['nullable', 'integer', 'min:0', 'max:500'],
            'margins.bottom' => ['nullable', 'integer', 'min:0', 'max:500'],
            'margins.left' => ['nullable', 'integer', 'min:0', 'max:500'],
        ]);

        $data['user_id'] = $user->id;

        $template = InvoiceTemplate::create($data);

        return response()->json($template, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, InvoiceTemplate $invoiceTemplate)
    {
        $this->authorizeAccess($request, $invoiceTemplate);
        return $invoiceTemplate;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, InvoiceTemplate $invoiceTemplate)
    {
        $this->authorizeAccess($request, $invoiceTemplate);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'elements' => ['sometimes', 'array'],
            'html_content' => ['nullable', 'string'],
            'page_width' => ['nullable', 'integer', 'min:100', 'max:2000'],
            'page_height' => ['nullable', 'integer', 'min:100', 'max:2000'],
            'background_color' => ['nullable', 'string', 'regex:/^#[a-fA-F0-9]{6}$/'],
            'paper_size' => ['nullable', 'string', 'in:A4,Letter,Legal,A3,Custom'],
            'margins' => ['nullable', 'array'],
            'margins.top' => ['nullable', 'integer', 'min:0', 'max:500'],
            'margins.right' => ['nullable', 'integer', 'min:0', 'max:500'],
            'margins.bottom' => ['nullable', 'integer', 'min:0', 'max:500'],
            'margins.left' => ['nullable', 'integer', 'min:0', 'max:500'],
        ]);

        $invoiceTemplate->update($data);

        return $invoiceTemplate;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, InvoiceTemplate $invoiceTemplate)
    {
        $this->authorizeAccess($request, $invoiceTemplate);

        $invoiceTemplate->delete();

        return response()->json(['status' => 'deleted']);
    }



    /**
     * Get template data for frontend preview.
     */
    public function getPreviewData(Request $request, InvoiceTemplate $invoiceTemplate)
    {
        $this->authorizeAccess($request, $invoiceTemplate);

        // Convert backend data to frontend format
        $frontendData = [
            'layout' => [
                'width' => $invoiceTemplate->page_width ? $invoiceTemplate->page_width / 3.779527559 : 210, // Convert px to mm
                'height' => $invoiceTemplate->page_height ? $invoiceTemplate->page_height / 3.779527559 : 297,
                'unit' => 'mm',
                'margin' => $invoiceTemplate->margins ?? ['top' => 10, 'right' => 10, 'bottom' => 10, 'left' => 10],
            ],
            'components' => $invoiceTemplate->elements ?? [],
        ];

    }

    private function renderTemplateToHtml(InvoiceTemplate $template, $invoice = null, $paidOnInvoice = 0): string
    {
        $components = [];
        try {
            $components = is_array($template->elements)
                ? $template->elements
                : (is_string($template->elements) ? (json_decode($template->elements, true) ?? []) : []);
        } catch (\Throwable $t) {
            $components = [];
        }
        $layout = [
            'width' => $template->page_width ?? 794, // A4 width in px
            'height' => $template->page_height ?? 1123, // A4 height in px
            'margin' => (function ($m) {
                try {
                    $decoded = is_array($m) ? $m : (is_string($m) ? (json_decode($m, true) ?: null) : null);
                    $defaults = ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20];
                    return array_merge($defaults, is_array($decoded) ? $decoded : []);
                } catch (\Throwable $t) {
                    return ['top' => 20, 'right' => 20, 'bottom' => 20, 'left' => 20];
                }
            })($template->margins)
        ];
        $backgroundColor = $template->background_color ?? '#ffffff';

        // Load active footer rules for the user
        $footerRules = FooterRule::where('user_id', $template->user_id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: ' . $backgroundColor . ';
            color: #333;
        }
        .canvas {
            position: relative;
            width: ' . $layout['width'] . 'px;
            height: ' . $layout['height'] . 'px;
            background-color: ' . $backgroundColor . ';
            margin: ' . $layout['margin']['top'] . 'px ' . $layout['margin']['right'] . 'px ' . $layout['margin']['bottom'] . 'px ' . $layout['margin']['left'] . 'px;
            box-sizing: border-box;
        }
        .component {
            position: absolute;
            box-sizing: border-box;
        }
        .component img {
            max-width: 100%;
            height: auto;
        }
        .component table {
            width: 100%;
            border-collapse: collapse;
        }
        .component th, .component td {
            border: 1px solid #ddd;
            padding: 4px;
            text-align: left;
        }
        .component th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="canvas">';

        foreach ($components as $component) {
            $type = $component['type'] ?? '';
            $x = $component['x'] ?? 0;
            $y = $component['y'] ?? 0;
            $props = $component['props'] ?? [];
            $width = $props['width'] ?? 100;
            $height = $props['height'] ?? 50;
            $background = $props['background'] ?? '#fff';
            $padding = $props['padding'] ?? 5;
            $fontSize = $props['fontSize'] ?? 12;
            $alignment = $props['alignment'] ?? 'left';
            $margin = $props['margin'] ?? ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0];

            $content = $this->renderComponentContent($component, $invoice, $paidOnInvoice);

            $html .= '<div class="component" style="left: ' . $x . 'px; top: ' . $y . 'px; width: ' . $width . 'px; height: ' . $height . 'px; background-color: ' . $background . '; padding: ' . $padding . 'px; font-size: ' . $fontSize . 'px; text-align: ' . $alignment . '; margin-top: ' . $margin['top'] . 'px; margin-right: ' . $margin['right'] . 'px; margin-bottom: ' . $margin['bottom'] . 'px; margin-left: ' . $margin['left'] . 'px;">';
            $html .= $content;
            $html .= '</div>';
        }

        $html .= '    </div>
</body>
</html>';

        return $html;
    }

    private function renderComponentContent($component, $invoice = null, $paidOnInvoice = 0): string
    {
        $type = $component['type'] ?? '';
        $props = $component['props'] ?? [];
        $text = $props['text'] ?? '';
        $imageUrl = $props['imageUrl'] ?? '';

        switch ($type) {
            case 'logo':
                if ($imageUrl) {
                    return '<img src="' . htmlspecialchars($imageUrl) . '" alt="Logo" />';
                }
                return htmlspecialchars($text ?: 'Logo');
            case 'companyInfo':
                if ($invoice && $invoice->user) {
                    $user = $invoice->user;
                    return htmlspecialchars($user->name ?? '') . '<br>' . htmlspecialchars($user->email ?? '');
                }
                return htmlspecialchars($text ?: 'Company Info');
            case 'customerInfo':
                if ($invoice && $invoice->customer) {
                    $customer = $invoice->customer;
                    return htmlspecialchars($customer->name ?? '') . '<br>' . htmlspecialchars($customer->email ?? '');
                }
                return htmlspecialchars($text ?: 'Customer Info');
            case 'itemsTable':
                if ($invoice && $invoice->items && $invoice->items->count() > 0) {
                    $table = '<table>';
                    $table .= '<thead><tr><th>Service</th><th>Qty</th><th>Amount</th><th>Subtotal</th></tr></thead>';
                    $table .= '<tbody>';
                    foreach ($invoice->items as $item) {
                        $table .= '<tr>';
                        $table .= '<td>' . htmlspecialchars($item->service ?? '') . '</td>';
                        $table .= '<td>' . htmlspecialchars($item->qty ?? 0) . '</td>';
                        $table .= '<td>' . number_format($item->amount ?? 0, 2) . '</td>';
                        $table .= '<td>' . number_format($item->sub_amount ?? 0, 2) . '</td>';
                        $table .= '</tr>';
                    }
                    $table .= '</tbody></table>';
                    return $table;
                }
                return htmlspecialchars($text ?: 'Items Table');
            case 'totals':
                $total = $invoice ? $invoice->amount : 0;
                $paid = $paidOnInvoice;
                $outstanding = $total - $paid;
                return 'Total: ' . number_format($total, 2) . '<br>Paid: ' . number_format($paid, 2) . '<br>Outstanding: ' . number_format($outstanding, 2);
            case 'notes':
                return htmlspecialchars($text ?: 'Notes');
            default:
                return htmlspecialchars($text ?: 'Component');
        }
    }

    private function getElementLabel(array $element): string
    {
        $content = $element['content'] ?? '';

        if (stripos($content, 'customer_name') !== false) {
            return 'Customer Name';
        } elseif (stripos($content, 'customer_company') !== false) {
            return 'Company';
        } elseif (stripos($content, 'customer_address') !== false) {
            return 'Address';
        } elseif (stripos($content, 'customer_phone') !== false) {
            return 'Phone';
        } elseif (stripos($content, 'customer_email') !== false) {
            return 'Email';
        } elseif (stripos($content, 'booking_location') !== false) {
            return 'Location';
        } elseif (stripos($content, 'booking_status') !== false) {
            return 'Status';
        }

        // Default label based on content
        return ucfirst(str_replace(['{{', '}}', '_'], ['', '', ' '], $content));
    }

    private function getSummaryLabel(array $element): string
    {
        $content = $element['content'] ?? '';

        if (stripos($content, 'total_amount') !== false) {
            return 'Total Amount';
        } elseif (stripos($content, 'paid_amount') !== false) {
            return 'Paid Amount';
        } elseif (stripos($content, 'outstanding_balance') !== false) {
            return 'Outstanding Balance';
        }

        return ucfirst(str_replace(['{{', '}}', '_'], ['', '', ' '], $content));
    }

    private function buildElementStyle(array $element): string
    {
        $style = '';

        if (isset($element['position'])) {
            $pos = $element['position'];
            $style .= 'left: ' . ($pos['x'] ?? 0) . 'px; ';
            $style .= 'top: ' . ($pos['y'] ?? 0) . 'px; ';
        }

        if (isset($element['size'])) {
            $size = $element['size'];
            $style .= 'width: ' . ($size['width'] ?? 200) . 'px; ';
            $style .= 'height: ' . ($size['height'] ?? 50) . 'px; ';
        }

        if (isset($element['style'])) {
            $elemStyle = $element['style'];

            if (isset($elemStyle['fontSize'])) {
                $style .= 'font-size: ' . $elemStyle['fontSize'] . 'px; ';
            }
            if (isset($elemStyle['fontWeight'])) {
                $style .= 'font-weight: ' . $elemStyle['fontWeight'] . '; ';
            }
            if (isset($elemStyle['color'])) {
                $style .= 'color: ' . $elemStyle['color'] . '; ';
            }
            if (isset($elemStyle['textAlign'])) {
                $style .= 'text-align: ' . $elemStyle['textAlign'] . '; ';
            }
        }

        return $style;
    }

    private function renderElementContent(array $element, $invoice = null, $paidOnInvoice = 0): string
    {
        $type = $element['type'] ?? 'text';
        $content = $element['content'] ?? '';

        // Debug: Log the element content before replacement
        Log::info('Element content before replacement', ['type' => $type, 'content' => $content, 'has_invoice' => $invoice ? 'yes' : 'no']);

        // Replace placeholders with actual invoice data
        if ($invoice) {
            $content = $this->replacePlaceholders($content, $invoice, $paidOnInvoice);
            Log::info('Element content after replacement', ['content' => $content]);
        }

        switch ($type) {
            case 'text':
                return nl2br(htmlspecialchars($content));

            case 'image':
                if (isset($element['src'])) {
                    return '<img src="' . htmlspecialchars($element['src']) . '" alt="Image" />';
                }
                return '';

            case 'table':
                return $this->renderTableContent($element, $invoice);

            default:
                return nl2br(htmlspecialchars($content));
        }
    }

    private function replacePlaceholders(string $content, $invoice, $paidOnInvoice = 0): string
    {
        $currency = $invoice->user->currency ?? 'USD';
        $advancePayment = (float)($invoice->advance_payment ?? 0);
        $totalPaid = $advancePayment + $paidOnInvoice;
        $outstanding = max(0, (float)($invoice->amount ?? 0) - $totalPaid);

        $placeholders = [
            '{{invoice_number}}' => $invoice->number ?? '',
            '{{invoice_date}}' => $invoice->issued_at ? $invoice->issued_at->format('M d, Y') : '',
            '{{due_date}}' => $invoice->due_at ? $invoice->due_at->format('M d, Y') : '',
            '{{invoice_status}}' => ucfirst($invoice->status ?? ''),

            // Customer details
            '{{customer_name}}' => $invoice->customer->name ?? '',
            '{{customer_company}}' => $invoice->customer->company ?? '',
            '{{customer_address}}' => $invoice->customer->address ?? '',
            '{{customer_phone}}' => $invoice->customer->phone ?? '',
            '{{customer_email}}' => $invoice->customer->email ?? '',
            '{{customer_whatsapp}}' => $invoice->customer->whatsapp ?? '',

            // Business details
            '{{business_name}}' => $invoice->user->name ?? '',
            '{{business_address}}' => $invoice->user->address ?? '',
            '{{business_phone}}' => $invoice->user->phone ?? '',
            '{{business_email}}' => $invoice->user->email ?? '',
            '{{business_website}}' => $invoice->user->website ?? '',

            // Financial details
            '{{total_amount}}' => number_format($invoice->amount ?? 0, 2),
            '{{discount}}' => number_format($invoice->discount ?? 0, 2),
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
            '{{booking_advance_payment}}' => $invoice->booking ? number_format($invoice->booking->advance_payment ?? 0, 2) : '0.00',
            '{{transport_charges}}' => $invoice->booking ? number_format($invoice->booking->transport_charges ?? 0, 2) : '0.00',
        ];

        return str_replace(array_keys($placeholders), array_values($placeholders), $content);
    }

    private function renderTableContent(array $element, $invoice = null): string
    {
        // If this is an invoice items table and we have invoice data
        if ($invoice && isset($element['content']) && $element['content'] === 'invoice_items') {
            return $this->renderInvoiceItemsTable($invoice);
        }

        // If this is a payment history table and we have invoice data
        if ($invoice && isset($element['content']) && $element['content'] === 'payment_history') {
            return $this->renderPaymentHistoryTable($invoice);
        }

        $content = $element['content'] ?? [];

        if (!is_array($content) || empty($content)) {
            return '<table><tr><td>No data</td></tr></table>';
        }

        $html = '<table>';

        // Header row
        if (isset($content[0])) {
            $html .= '<tr>';
            foreach ($content[0] as $key => $value) {
                $html .= '<th>' . htmlspecialchars($key) . '</th>';
            }
            $html .= '</tr>';
        }

        // Data rows
        foreach ($content as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . htmlspecialchars($cell) . '</td>';
            }
            $html .= '</tr>';
        }

        $html .= '</table>';

        return $html;
    }

    private function renderInvoiceItemsTable($invoice): string
    {
        if (!$invoice->items || $invoice->items->isEmpty()) {
            return '<table><tr><td>No items</td></tr></table>';
        }

        $currency = $invoice->user->currency ?? 'USD';

        $html = '<table>';
        $html .= '<thead><tr>';
        $html .= '<th>Service</th>';
        $html .= '<th>Qty</th>';
        $html .= '<th>Amount (' . $currency . ')</th>';
        $html .= '<th>Sub Amount (' . $currency . ')</th>';
        $html .= '</tr></thead>';
        $html .= '<tbody>';

        foreach ($invoice->items as $item) {
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($item->service) . '</td>';
            $html .= '<td>' . htmlspecialchars($item->qty) . '</td>';
            $html .= '<td>' . number_format($item->amount, 2) . '</td>';
            $html .= '<td>' . number_format($item->sub_amount, 2) . '</td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table>';

        return $html;
    }

    private function renderPaymentHistoryTable($invoice): string
    {
        if (!$invoice->payments || $invoice->payments->isEmpty()) {
            return '<table><tr><td>No payments found</td></tr></table>';
        }

        $currency = $invoice->user->currency ?? 'USD';

        $html = '<table>';
        $html .= '<thead><tr>';
        $html .= '<th>Date</th>';
        $html .= '<th>Amount (' . $currency . ')</th>';
        $html .= '<th>Method</th>';
        $html .= '<th>Reference</th>';
        $html .= '<th>Status</th>';
        $html .= '</tr></thead>';
        $html .= '<tbody>';

        foreach ($invoice->payments as $payment) {
            $html .= '<tr>';
            $html .= '<td>' . ($payment->paid_at ? $payment->paid_at->format('M d, Y') : 'N/A') . '</td>';
            $html .= '<td>' . number_format($payment->amount, 2) . '</td>';
            $html .= '<td>' . htmlspecialchars($payment->method ?? 'N/A') . '</td>';
            $html .= '<td>' . htmlspecialchars($payment->reference ?? 'N/A') . '</td>';
            $html .= '<td>' . ucfirst($payment->status ?? 'N/A') . '</td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table>';

        return $html;
    }

    private function authorizeAccess(Request $request, InvoiceTemplate $template): void
    {
        abort_if($template->user_id !== $request->user()->id, 403);
    }
}
