<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\JobCard;
use App\Models\JobCardTask;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\FooterRule;
use App\Models\InvoiceTemplate;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JobCardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = JobCard::with(['booking','items','tasks'])
            ->where('user_id', $user->id)
            ->orderByDesc('id');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->query('q')) {
            $query->where(function ($q2) use ($search) {
                $q2->where('title', 'like', "%$search%")
                   ->orWhere('status', 'like', "%$search%")
                   ->orWhere('assigned_to', 'like', "%$search%");
            });
        }
        $result = $query->paginate((int) $request->query('per_page', 10));
        // Append total_paid (sum of paid payments tied to this job card)
        $result->getCollection()->transform(function ($job) {
            $paid = \App\Models\Payment::where('job_card_id', $job->id)->where('status','paid')->sum('amount');
            $job->total_paid = (float) $paid;
            return $job;
        });
        return $result;
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'booking_id' => ['required','integer','exists:bookings,id'],
            'title' => ['required','string','max:255'],
            'description' => ['nullable','string'],
            'status' => ['nullable','string','in:open,in_progress,done'],
            'assigned_to' => ['nullable','string','max:255'],
            'due_date' => ['nullable','date'],
            'confirmed_amount' => ['nullable','numeric','min:0'],
            'advance_payment' => ['nullable','numeric','min:0'],
            'discount' => ['nullable','numeric','min:0'],
            'transport_charges' => ['nullable','numeric','min:0'],
            'items' => ['nullable','array'],
            'items.*.service' => ['required','string','max:255'],
            'items.*.qty' => ['required','integer','min:1'],
            'items.*.amount' => ['required','numeric','min:0'],
            'items.*.subamount' => ['required','numeric','min:0'],
            'tasks' => ['nullable','array'],
            'tasks.*.title' => ['required','string','max:255'],
            'tasks.*.description' => ['nullable','string'],
            'tasks.*.completed' => ['nullable','boolean'],
            'tasks.*.completed_at' => ['nullable','date'],
        ]);
        Booking::where('id', $data['booking_id'])->where('user_id', $user->id)->firstOrFail();
        $data['user_id'] = $user->id;
        // Compute confirmed_amount from items - discount (transport charges are separate)
        if (!empty($data['items'])) {
            $subtotal = 0;
            foreach ($data['items'] as $it) { $subtotal += $it['subamount']; }
            $discount = $data['discount'] ?? 0;
            $data['confirmed_amount'] = max(0, $subtotal - $discount);
        }
        // Auto status based on advance payment if not explicitly provided
        if (empty($data['status'])) {
            $adv = (float)($data['advance_payment'] ?? 0);
            $data['status'] = $adv > 0 ? 'in_progress' : 'open';
        }
        $job = JobCard::create($data);
        if (!empty($data['items'])) {
            foreach ($data['items'] as $it) {
                \App\Models\JobCardItem::create([
                    'job_card_id' => $job->id,
                    'service' => $it['service'],
                    'qty' => $it['qty'],
                    'amount' => $it['amount'],
                    'sub_amount' => $it['subamount'],
                ]);
            }
        }
        if (!empty($data['tasks'])) {
            foreach ($data['tasks'] as $task) {
                \App\Models\JobCardTask::create([
                    'job_card_id' => $job->id,
                    'title' => $task['title'],
                    'description' => $task['description'] ?? null,
                    'completed' => $task['completed'] ?? false,
                    'completed_at' => $task['completed_at'] ?? null,
                ]);
            }
        }
        // If an advance was specified on creation, also record a Payment for it (to keep totals consistent)
        if ((float)($job->advance_payment ?? 0) > 0) {
            \App\Models\Payment::create([
                'user_id' => $user->id,
                'customer_id' => $job->booking->customer_id ?? null,
                'booking_id' => $job->booking_id,
                'job_card_id' => $job->id,
                'amount' => (float)$job->advance_payment,
                'currency' => $user->currency ?? 'USD',
                'method' => 'advance',
                'reference' => 'job-card-advance',
                'status' => 'paid',
                'paid_at' => now(),
            ]);
        }
        return response()->json($job->load(['booking','items','tasks','user']), 201);
    }

    public function show(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);
        return $job_card->load('booking');
    }

    public function update(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);
        $oldAdvance = (float)($job_card->advance_payment ?? 0);
        $data = $request->validate([
            'booking_id' => ['sometimes','integer','exists:bookings,id'],
            'title' => ['sometimes','string','max:255'],
            'description' => ['nullable','string'],
            'status' => ['nullable','string','in:open,in_progress,done'],
            'assigned_to' => ['nullable','string','max:255'],
            'due_date' => ['nullable','date'],
            'confirmed_amount' => ['sometimes','numeric','min:0'],
            'advance_payment' => ['sometimes','numeric','min:0'],
            'discount' => ['sometimes','numeric','min:0'],
            'transport_charges' => ['sometimes','numeric','min:0'],
            'items' => ['nullable','array'],
            'items.*.service' => ['required','string','max:255'],
            'items.*.qty' => ['required','integer','min:1'],
            'items.*.amount' => ['required','numeric','min:0'],
            'items.*.subamount' => ['required','numeric','min:0'],
            'tasks' => ['nullable','array'],
            'tasks.*.id' => ['nullable','integer','exists:job_card_tasks,id'],
            'tasks.*.title' => ['required','string','max:255'],
            'tasks.*.description' => ['nullable','string'],
            'tasks.*.completed' => ['nullable','boolean'],
            'tasks.*.completed_at' => ['nullable','date'],
        ]);
        if (isset($data['booking_id'])) {
            Booking::where('id', $data['booking_id'])->where('user_id', $request->user()->id)->firstOrFail();
        }
        // If items provided, replace and recompute confirmed amount
        // Also recompute if transport_charges or discount changed without items
        $shouldRecalculate = !empty($data['items']) || isset($data['transport_charges']) || isset($data['discount']);
        if ($shouldRecalculate) {
            $subtotal = 0;
            if (!empty($data['items'])) {
                foreach ($data['items'] as $it) { $subtotal += $it['subamount']; }
            } else {
                // Use existing items subtotal
                $subtotal = $job_card->items()->sum('sub_amount');
            }
            $discount = $data['discount'] ?? ($job_card->discount ?? 0);
            // confirmed_amount is photography amount only, transport is separate
            $data['confirmed_amount'] = max(0, $subtotal - $discount);
        }
        // Auto status update if not done and advance payment changed
        if ($job_card->status !== 'done' && array_key_exists('advance_payment', $data)) {
            $adv = (float)($data['advance_payment'] ?? 0);
            $data['status'] = $adv > 0 ? 'in_progress' : 'open';
        }
        $job_card->update($data);
        if (!empty($data['items'])) {
            $job_card->items()->delete();
            foreach ($data['items'] as $it) {
                \App\Models\JobCardItem::create([
                    'job_card_id' => $job_card->id,
                    'service' => $it['service'],
                    'qty' => $it['qty'],
                    'amount' => $it['amount'],
                    'sub_amount' => $it['subamount'],
                ]);
            }
        }
        if (array_key_exists('tasks', $data)) {
            // Delete existing tasks and create new ones
            $job_card->tasks()->delete();
            if (!empty($data['tasks'])) {
                foreach ($data['tasks'] as $task) {
                    \App\Models\JobCardTask::create([
                        'job_card_id' => $job_card->id,
                        'title' => $task['title'],
                        'description' => $task['description'] ?? null,
                        'completed' => $task['completed'] ?? false,
                        'completed_at' => $task['completed_at'] ?? null,
                    ]);
                }
            }
        }
        // If advance is newly added (previously 0), create a Payment for it (avoid duplicates if payments already exist)
        if (array_key_exists('advance_payment', $data)) {
            $newAdvance = (float)($job_card->advance_payment ?? 0);
            if ($oldAdvance <= 0 && $newAdvance > 0) {
                $existingAdvance = \App\Models\Payment::where('job_card_id', $job_card->id)
                    ->where('method', 'advance')
                    ->where('status', 'paid')
                    ->exists();
                if (!$existingAdvance) {
                    \App\Models\Payment::create([
                        'user_id' => $request->user()->id,
                        'customer_id' => $job_card->booking->customer_id ?? null,
                        'booking_id' => $job_card->booking_id,
                        'job_card_id' => $job_card->id,
                        'amount' => $newAdvance,
                        'currency' => $request->user()->currency ?? 'USD',
                        'method' => 'advance',
                        'reference' => 'job-card-advance',
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);
                }
            }
        }
        return $job_card->load(['booking','items','tasks','user']);
    }

    public function destroy(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);
        $job_card->delete();
        return response()->json(['status' => 'deleted']);
    }

    private function authorizeAccess(Request $request, JobCard $job): void
    {
        abort_if($job->user_id !== $request->user()->id, 403);
    }

    public function createInvoice(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);
        $user = $request->user();
        $job_card->load(['items','booking']);

        // Check if job card has a booking
        if (!$job_card->booking) {
            return response()->json(['message' => 'Job card must have a booking to create an invoice'], 422);
        }

        try {
            $data = $request->validate([
                // Allow 0 for collect later, or positive amount for immediate collection
                'collect_amount' => ['required','numeric','min:0'],
                'currency' => ['nullable','string','size:3'],
                'method' => ['nullable','string','max:100'],
                'reference' => ['nullable','string','max:255'],
                'template_id' => ['required','integer','exists:invoice_templates,id'],
            ]);
        $subtotal = 0;
        foreach (($job_card->items ?? []) as $it) { $subtotal += (float) $it->sub_amount; }
        $discount = (float) ($job_card->discount ?? 0);
        $amount = max(0, $subtotal - $discount);

        // Job card advances already paid reduce the starting invoice due
        $jobAdvancePaid = (float) Payment::where('job_card_id', $job_card->id)->where('status','paid')->sum('amount');
        // Some users may set advance on the job card without recording a Payment; honor that too.
        $jobAdvanceField = (float) ($job_card->advance_payment ?? 0);
        $jobAdvanceEffective = max($jobAdvancePaid, $jobAdvanceField);
        $currentDue = max(0, $amount - $jobAdvanceEffective);

        // Validate collection amount does not exceed current due
        $col = (float)$data['collect_amount'];
        if ($col < 0) {
            return response()->json(['message' => 'collect_amount cannot be negative'], 422);
        }
        if ($col > $currentDue) {
            return response()->json(['message' => 'collect_amount cannot exceed current due'], 422);
        }

        // Generate invoice number
        $number = $this->generateInvoiceNumber();

        $invoice = DB::transaction(function () use ($user, $job_card, $amount, $discount, $number, $jobAdvanceEffective) {
            $inv = Invoice::create([
                'user_id' => $user->id,
                'customer_id' => $job_card->booking->customer_id ?? null,
                'booking_id' => $job_card->booking_id,
                'number' => $number,
                'amount' => $amount,
                'status' => 'sent',
                'issued_at' => now(),
                'discount' => $discount ?: null,
                'advance_payment' => $jobAdvanceEffective,
                'due_amount' => max(0, $amount - $jobAdvanceEffective),
            ]);
            foreach (($job_card->items ?? []) as $jit) {
                InvoiceItem::create([
                    'invoice_id' => $inv->id,
                    'service' => $jit->service,
                    'qty' => $jit->qty,
                    'amount' => $jit->amount,
                    'sub_amount' => $jit->sub_amount,
                ]);
            }
            return $inv;
        });

        // Optional immediate collection (advance on invoice)
        if ($col > 0) {
            $pay = Payment::create([
                'user_id' => $user->id,
                'customer_id' => $invoice->customer_id,
                'booking_id' => $invoice->booking_id,
                'invoice_id' => $invoice->id,
                'job_card_id' => $job_card->id,
                'amount' => $col,
                'currency' => $data['currency'] ?? ($user->currency ?? 'USD'),
                'method' => $data['method'] ?? 'cash',
                'reference' => $data['reference'] ?? null,
                'status' => 'paid',
                'paid_at' => now(),
            ]);
            // Update invoice due
            $paid = Payment::where('invoice_id', $invoice->id)->where('status','paid')->sum('amount');
            $invoice->due_amount = max(0, $amount - ($invoice->advance_payment ?? 0) - $paid);
            $invoice->save();

            // Update job card status (do not mutate advance_payment after invoicing)
            $advanceSum = Payment::where('job_card_id', $job_card->id)->where('status','paid')->sum('amount');
            if ($job_card->status !== 'done') {
                $job_card->status = $advanceSum > 0 ? 'in_progress' : 'open';
                $job_card->save();
            }
        }

        // Generate PDF
        $template = InvoiceTemplate::where('id', $data['template_id'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $footerRules = FooterRule::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        $htmlContent = $this->generateInvoiceHtml($invoice, $template, $footerRules, $job_card, $user);

        // Create PDF using DomPDF
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false); // Disable remote resources for security

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($htmlContent);

        // Set paper size
        $paperSize = $template->paper_size ?? 'a4';
        $orientation = 'portrait';
        $dompdf->setPaper($paperSize, $orientation);

        $dompdf->render();

        $filename = 'invoice_' . $invoice->number . '.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"'
        ]);
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Invoice creation failed: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
                'job_card_id' => $job_card->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to create invoice: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Create a transport-only invoice for a job card and optionally associate the collected payment.
     * Returns a PDF like the standard invoice generator but with a single Transport Charges line item.
     */
    public function createTransportInvoice(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);
        $user = $request->user();

        $data = $request->validate([
            'amount' => ['required','numeric','min:0'],
            'currency' => ['nullable','string','size:3'],
            'method' => ['nullable','string','max:100'],
            'reference' => ['nullable','string','max:255'],
            'template_id' => ['required','integer','exists:invoice_templates,id'],
        ]);

        $amount = (float) $data['amount'];
        $currency = $data['currency'] ?? ($user->currency ?? 'USD');
        $method = $data['method'] ?? 'cash';
        $reference = $data['reference'] ?? null;

        // Generate invoice number
        $number = $this->generateInvoiceNumber();

        // Create invoice and item; attach/record payment in a transaction
        $invoice = DB::transaction(function () use ($user, $job_card, $amount, $number) {
            $inv = Invoice::create([
                'user_id' => $user->id,
                'customer_id' => $job_card->booking->customer_id ?? null,
                'booking_id' => $job_card->booking_id,
                'number' => $number,
                'amount' => $amount,
                'status' => 'paid',
                'issued_at' => now(),
                'discount' => null,
                'advance_payment' => 0,
                'due_amount' => 0,
            ]);
            InvoiceItem::create([
                'invoice_id' => $inv->id,
                'service' => 'Transport Charges',
                'qty' => 1,
                'amount' => $amount,
                'sub_amount' => $amount,
            ]);
            return $inv;
        });

        // Link to an existing transport payment if present (no duplicates)
        $existingPayment = Payment::where('job_card_id', $job_card->id)
            ->whereNull('invoice_id')
            ->where('status', 'paid')
            ->orderByDesc('paid_at')
            ->first();

        if ($existingPayment && (float)$existingPayment->amount === $amount) {
            $existingPayment->invoice_id = $invoice->id;
            $existingPayment->save();
        } else {
            // Create a new payment record for this invoice if not already recorded
            Payment::create([
                'user_id' => $user->id,
                'customer_id' => $invoice->customer_id,
                'booking_id' => $invoice->booking_id,
                'invoice_id' => $invoice->id,
                'job_card_id' => $job_card->id,
                'amount' => $amount,
                'currency' => $currency,
                'method' => $method,
                'reference' => $reference,
                'status' => 'paid',
                'paid_at' => now(),
            ]);
        }

        // Load template and render PDF
        $template = InvoiceTemplate::where('id', $data['template_id'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $footerRules = FooterRule::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        $job_card->load(['items','booking']);
        $htmlContent = $this->generateInvoiceHtml($invoice, $template, $footerRules, $job_card, $user);

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($htmlContent);
        $dompdf->setPaper($template->paper_size ?? 'a4', 'portrait');
        $dompdf->render();

        $filename = 'invoice_' . $invoice->number . '.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"'
        ]);
    }

    private function generateInvoiceHtml($invoice, $template, $footerRules, $jobCard, $user)
    {
        $invoice->load(['customer', 'booking', 'items', 'payments']);

        $currency = $user->currency ?? 'USD';
        $currencySymbol = $this->getCurrencySymbol($currency);

        // Handle logo
        $logoSrc = null;
        if ($user && $user->logo_path) {
            $logoPath = storage_path('app/public/' . $user->logo_path);
            if (file_exists($logoPath)) {
                $logoData = file_get_contents($logoPath);
                $mimeType = mime_content_type($logoPath);
                $logoSrc = 'data:' . $mimeType . ';base64,' . base64_encode($logoData);
            }
        }

        // If template has html_content, use it as base
        $html = $template->html_content ?? '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title></head><body></body></html>';

        // For now, create a simple HTML structure
        // In a real implementation, you'd parse the template elements and replace placeholders
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invoice ' . $invoice->number . '</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .header { margin-bottom: 20px; }
                .logo-section { text-align: center; margin-bottom: 20px; }
                .logo { height: 100px; max-width: 300px; margin-bottom: 15px; }
                .company-info { text-align: center; }
                .company-info h2 { margin: 0 0 5px 0; font-size: 18px; }
                .company-info p { margin: 2px 0; font-size: 12px; color: #666; }
                .invoice-title { margin-bottom: 20px; border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 10px 0; }
                .invoice-title-content { display: flex; justify-content: space-between; align-items: center; }
                .invoice-title h1 { margin: 0; font-size: 24px; font-weight: bold; }
                .invoice-number { font-size: 14px; font-weight: bold; color: #333; }
                .details-row { display: flex; margin-bottom: 20px; border: 1px solid #ddd; }
                .details-column { flex: 1; padding: 10px; border-right: 1px solid #ddd; }
                .details-column:last-child { border-right: none; }
                .details-column h3 { margin: 0 0 5px 0; font-size: 11px; color: #333; text-transform: uppercase; font-weight: bold; }
                .details-column p { margin: 2px 0; font-size: 10px; line-height: 1.3; color: #555; }
                .details-column strong { font-weight: bold; color: #333; }
                .customer-details, .booking-details { margin-bottom: 30px; }
                .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #333; }
                .items-table th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #000000; padding: 12px; text-align: left; font-weight: bold; font-size: 12px; border: 1px solid #555; }
                .items-table td { padding: 12px; border: 1px solid #ddd; font-size: 12px; }
                .items-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
                .items-table tbody tr:hover { background-color: #e3f2fd; }
                .totals { margin: 15px 0; padding: 10px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border: 2px solid #333; border-radius: 5px; }
                .totals p { margin: 8px 0; font-size: 12px; font-weight: bold; color: #333; }
                .totals p strong { color: #2c3e50; }
                .footer { margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
                .footer-rule { margin-bottom: 8px; font-size: 12px; color: #555; padding: 8px; background: #f8f9fa; border-left: 4px solid #667eea; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    ' . ($logoSrc ? '<img src="' . $logoSrc . '" alt="Logo" class="logo" />' : '') . '
                    <div class="company-info">
                        <h2>' . ($user->name ?? 'Company Name') . '</h2>
                        ' . ($user->address ? '<p>' . $user->address . '</p>' : '') . '
                        <p>
                            ' . ($user->phone ? 'Phone: ' . $user->phone : '') . '
                            ' . ($user->email ? ' | Email: ' . $user->email : '') . '
                            ' . ($user->website ? ' | Website: ' . $user->website : '') . '
                        </p>
                    </div>
                </div>
                <div class="invoice-title">
                    <div class="invoice-title-content">
                        <h1>INVOICE</h1>
                        <div class="invoice-number">Invoice Number: ' . $invoice->number . '</div>
                    </div>
                </div>
            </div>

            <div class="details-row">
                <div class="details-column">
                    <h3>Customer Details</h3>
                    <p><strong>Name:</strong> ' . ($invoice->customer->name ?? 'N/A') . ', <strong>Email:</strong> ' . ($invoice->customer->email ?? 'N/A') . ', <strong>Phone:</strong> ' . ($invoice->customer->phone ?? 'N/A') . ', <strong>Address:</strong> ' . ($invoice->customer->address ?? 'N/A') . '</p>
                </div>

                <div class="details-column">
                    <h3>Booking Details</h3>
                    <p><strong>Booking ID:</strong> ' . ($invoice->booking->id ?? 'N/A') . '</p>
                    <p><strong>Job Card:</strong> ' . ($jobCard->title ?? 'N/A') . '</p>
                    <p><strong>Description:</strong> ' . ($jobCard->description ?? 'N/A') . '</p>';

        // Add detailed booking dates and locations
        $booking = $invoice->booking;
        if ($booking) {
            $eventDetails = [];

            // Wedding Shoot
            if ($booking->wedding_shoot_date) {
                $eventDetails[] = '<strong>Wedding Shoot:</strong> ' . \Carbon\Carbon::parse($booking->wedding_shoot_date)->format('Y-m-d') .
                                 ($booking->wedding_shoot_location ? ' at ' . $booking->wedding_shoot_location : '');
            }

            // Pre-shoot
            if ($booking->preshoot_date) {
                $eventDetails[] = '<strong>Pre-shoot:</strong> ' . \Carbon\Carbon::parse($booking->preshoot_date)->format('Y-m-d') .
                                 ($booking->preshoot_location ? ' at ' . $booking->preshoot_location : '');
            }

            // Homecoming
            if ($booking->homecoming_date) {
                $eventDetails[] = '<strong>Homecoming:</strong> ' . \Carbon\Carbon::parse($booking->homecoming_date)->format('Y-m-d') .
                                 ($booking->homecoming_location ? ' at ' . $booking->homecoming_location : '');
            }

            // Function
            if ($booking->function_date) {
                $eventDetails[] = '<strong>Function:</strong> ' . \Carbon\Carbon::parse($booking->function_date)->format('Y-m-d') .
                                 ($booking->function_location ? ' at ' . $booking->function_location : '');
            }

            // Event Covering
            if ($booking->event_covering_date) {
                $eventDetails[] = '<strong>Event Covering:</strong> ' . \Carbon\Carbon::parse($booking->event_covering_date)->format('Y-m-d') .
                                 ($booking->event_covering_location ? ' at ' . $booking->event_covering_location : '');
            }

            // Custom Plan
            if ($booking->custom_plan_date) {
                $eventDetails[] = '<strong>Custom Plan:</strong> ' . \Carbon\Carbon::parse($booking->custom_plan_date)->format('Y-m-d') .
                                 ($booking->custom_plan_location ? ' at ' . $booking->custom_plan_location : '');
            }

            if (!empty($eventDetails)) {
                $html .= '<p><strong>Event Schedule:</strong> ' . implode(' • ', $eventDetails) . '</p>';
            }
        }

        $html .= '</div>

                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>';
        
        foreach ($invoice->items as $item) {
            $html .= '
                    <tr>
                        <td>' . $item->service . '</td>
                        <td>' . $item->qty . '</td>
                        <td>' . $currencySymbol . number_format($item->amount, 2) . '</td>
                        <td>' . $currencySymbol . number_format($item->sub_amount, 2) . '</td>
                    </tr>';
        }
        
        $html .= '
                </tbody>
            </table>
            
            <div class="totals">
                <p><strong>Subtotal:</strong> ' . $currencySymbol . number_format($invoice->amount + ($invoice->discount ?? 0), 2) . '</p>';
        
        if ($invoice->discount > 0) {
            $html .= '<p><strong>Discount:</strong> -' . $currencySymbol . number_format($invoice->discount, 2) . '</p>';
        }
        
        // Get advance payment from booking
        $advancePayment = $invoice->booking->advance_payment ?? 0;
        if ($advancePayment > 0) {
            $html .= '<p><strong>Advance Payment:</strong> -' . $currencySymbol . number_format($advancePayment, 2) . '</p>';
        }
        
        // Calculate total paid amount for this invoice (actual payments made)
        $paidAmount = $invoice->payments()->where('status', 'paid')->sum('amount');
        if ($paidAmount > 0) {
            $html .= '<p><strong>Total Paid Amount:</strong> -' . $currencySymbol . number_format($paidAmount, 2) . '</p>';
        }
        
        // Show last payment details
        $lastPayment = $invoice->payments()->where('status', 'paid')->orderBy('paid_at', 'desc')->first();
        if ($lastPayment) {
            $html .= '<p><strong>Last Payment:</strong> ' . $currencySymbol . number_format($lastPayment->amount, 2) . ' (' . $lastPayment->paid_at->format('Y-m-d') . ' via ' . ($lastPayment->method ?? 'N/A') . ')</p>';
        }
        
        $html .= '<p><strong>Total Due:</strong> ' . $currencySymbol . number_format($invoice->due_amount, 2) . '</p>
            </div>';
        
        // Add footer rules
        if ($footerRules->count() > 0) {
            $html .= '<div class="footer">';
            foreach ($footerRules as $rule) {
                $html .= '<div class="footer-rule"><strong>' . $rule->title . ':</strong> ' . $rule->content . '</div>';
            }
            $html .= '</div>';
        }
        
        $html .= '
        </body>
        </html>';
        
        return $html;
    }

    private function getCurrencySymbol($currency)
    {
        $symbols = [
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'JPY' => '¥',
            'CAD' => 'C$',
            'AUD' => 'A$',
            'CHF' => 'CHF',
            'CNY' => '¥',
            'INR' => '₹',
            'BRL' => 'R$',
            'MXN' => '$',
            'RUB' => '₽',
            'KRW' => '₩',
            'SGD' => 'S$',
            'HKD' => 'HK$',
            'NZD' => 'NZ$',
            'SEK' => 'kr',
            'NOK' => 'kr',
            'DKK' => 'kr',
            'PLN' => 'zł',
            'CZK' => 'Kč',
            'HUF' => 'Ft',
            'TRY' => '₺',
            'ZAR' => 'R',
            'EGP' => '£',
            'SAR' => '﷼',
            'AED' => 'د.إ',
            'THB' => '฿',
            'MYR' => 'RM',
            'IDR' => 'Rp',
            'PHP' => '₱',
            'VND' => '₫',
        ];

        return $symbols[$currency] ?? $currency;
    }

    private function generateInvoiceNumber(): string
    {
        $date = now()->format('Ymd');
        for ($i = 0; $i < 5; $i++) {
            $rand = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $number = "INV-{$date}-{$rand}";
            if (!Invoice::where('number', $number)->exists()) {
                return $number;
            }
        }
        return 'INV-'.now()->format('YmdHis');
    }

    // Task management methods
    public function createTask(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);

        $data = $request->validate([
            'title' => ['required','string','max:255'],
            'description' => ['nullable','string'],
            'completed' => ['nullable','boolean'],
        ]);

        $task = JobCardTask::create([
            'job_card_id' => $job_card->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'completed' => $data['completed'] ?? false,
            'completed_at' => ($data['completed'] ?? false) ? now() : null,
        ]);

        return response()->json($task, 201);
    }

    public function updateTask(Request $request, JobCard $job_card, JobCardTask $task)
    {
        $this->authorizeAccess($request, $job_card);

        // Ensure task belongs to the job card
        if ($task->job_card_id !== $job_card->id) {
            abort(404);
        }

        $data = $request->validate([
            'title' => ['sometimes','string','max:255'],
            'description' => ['nullable','string'],
            'completed' => ['sometimes','boolean'],
        ]);

        if (isset($data['completed'])) {
            $data['completed_at'] = $data['completed'] ? now() : null;
        }

        $task->update($data);

        return response()->json($task);
    }

    public function deleteTask(Request $request, JobCard $job_card, JobCardTask $task)
    {
        $this->authorizeAccess($request, $job_card);

        // Ensure task belongs to the job card
        if ($task->job_card_id !== $job_card->id) {
            abort(404);
        }

        $task->delete();

        return response()->json(['status' => 'deleted']);
    }

    public function toggleTask(Request $request, JobCard $job_card, JobCardTask $task)
    {
        $this->authorizeAccess($request, $job_card);

        // Ensure task belongs to the job card
        if ($task->job_card_id !== $job_card->id) {
            abort(404);
        }

        $task->completed = !$task->completed;
        $task->completed_at = $task->completed ? now() : null;
        $task->save();

        return response()->json($task);
    }

    public function getPayments(Request $request, JobCard $job_card)
    {
        $this->authorizeAccess($request, $job_card);
        $payments = Payment::where('job_card_id', $job_card->id)
            ->with(['invoice'])
            ->orderByDesc('paid_at')
            ->get();
        return response()->json($payments);
    }
}
