<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Invoice {{ $invoice->number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }
        h1 { font-size: 20px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background: #f5f5f5; }
        .totals { margin-top: 15px; width: 100%; }
        .totals td { border: none; }
        .right { text-align: right; }
    </style>
</head>
<body>
    @php
        $u = isset($brand) ? $brand : ($invoice->user ?? null);
        $currency = $u->currency ?? 'USD';
        $logoSrc = null;
        if ($u && $u->logo_path) {
            $imagePath = public_path('storage/' . $u->logo_path);
            if (file_exists($imagePath)) {
                $imageData = base64_encode(file_get_contents($imagePath));
                $mimeType = mime_content_type($imagePath);
                $logoSrc = 'data:' . $mimeType . ';base64,' . $imageData;
            }
        }
    @endphp
    <table style="width:100%; border:0; border-collapse:separate;">
        <tr>
            <td style="border:0; vertical-align:middle;">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Logo" style="height:48px;" />
                @endif
            </td>
            <td style="border:0; text-align:right;">
                @if($u)
                    <div style="font-weight:bold; font-size:14px;">{{ $u->name }}</div>
                    @if($u->address) <div style="color:#666; font-size:11px;">{{ $u->address }}</div> @endif
                    <div style="color:#666; font-size:11px;">
                        @if($u->phone) <span>Phone: {{ $u->phone }}</span> @endif
                        @if($u->email) <span style="margin-left:8px;">Email: {{ $u->email }}</span> @endif
                        @if($u->website) <span style="margin-left:8px;">Website: {{ $u->website }}</span> @endif
                    </div>
                @endif
            </td>
        </tr>
    </table>

    <h1 style="margin-top:12px;">Invoice {{ $invoice->number }}</h1>

    @if($invoice->customer)
    <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; background: #f9f9f9;">
        <strong>Customer Details:</strong><br>
        <strong>Name:</strong> {{ $invoice->customer->name }}<br>
        @if($invoice->customer->company)<strong>Company:</strong> {{ $invoice->customer->company }}<br>@endif
        @if($invoice->customer->address)<strong>Address:</strong> {{ $invoice->customer->address }}<br>@endif
        @if($invoice->customer->phone)<strong>Phone:</strong> {{ $invoice->customer->phone }}<br>@endif
        @if($invoice->customer->whatsapp)<strong>WhatsApp:</strong> {{ $invoice->customer->whatsapp }}<br>@endif
        @if($invoice->customer->email)<strong>Email:</strong> {{ $invoice->customer->email }}<br>@endif
        @if($invoice->customer->nic_or_dl)<strong>NIC/DL:</strong> {{ $invoice->customer->nic_or_dl }}<br>@endif
    </div>
    @endif

    @if($invoice->booking)
        <p><strong>Booking:</strong> #{{ $invoice->booking->id }}</p>
    @endif
    <p><strong>Status:</strong> {{ ucfirst($invoice->status) }}</p>
    <p><strong>Issued At:</strong> {{ $invoice->issued_at->format('M d, Y') }} @if($invoice->due_at)| <strong>Due At:</strong> {{ $invoice->due_at->format('M d, Y') }}@endif</p>

    @if($invoice->items && $invoice->items->count())
    <table>
        <thead>
            <tr>
                <th>Service</th>
                <th>Qty</th>
                <th>Amount ({{ $currency }})</th>
                <th>Sub Amount ({{ $currency }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
                <tr>
                    <td>{{ $item->service }}</td>
                    <td>{{ $item->qty }}</td>
                    <td>{{ number_format($item->amount, 2) }}</td>
                    <td>{{ number_format($item->sub_amount, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <table class="totals">
        @php
            $paidOnInv = isset($paidOnInvoice) ? (float)$paidOnInvoice : 0.0;
            $advancePayment = (float)($invoice->advance_payment ?? 0);
            $totalPaid = $advancePayment + $paidOnInv;
            $computedDue = max(0, (float)($invoice->amount ?? 0) - $totalPaid);
            $dueToShow = isset($paidOnInvoice)
                ? $computedDue
                : (float)($invoice->due_amount ?? (($invoice->amount ?? 0) - $advancePayment));
        @endphp
        <tr>
            <td class="right"><strong>Total Amount:</strong></td>
            <td class="right">{{ number_format($invoice->amount, 2) }} {{ $currency }}</td>
        </tr>
        @if($invoice->discount > 0)
        <tr>
            <td class="right"><strong>Discount:</strong></td>
            <td class="right">-{{ number_format($invoice->discount, 2) }} {{ $currency }}</td>
        </tr>
        @endif
        @if($advancePayment > 0)
        <tr>
            <td class="right"><strong>Advance Payment:</strong></td>
            <td class="right">-{{ number_format($advancePayment, 2) }} {{ $currency }}</td>
        </tr>
        @endif
        @if($paidOnInv > 0)
        <tr>
            <td class="right"><strong>Payment Received:</strong></td>
            <td class="right">-{{ number_format($paidOnInv, 2) }} {{ $currency }}</td>
        </tr>
        @endif
        <tr style="border-top: 2px solid #000;">
            <td class="right"><strong>Outstanding Balance:</strong></td>
            <td class="right"><strong>{{ number_format($dueToShow, 2) }} {{ $currency }}</strong></td>
        </tr>
    </table>

    @php
        $allPayments = \App\Models\Payment::where('invoice_id', $invoice->id)
            ->where('status', 'paid')
            ->orderBy('paid_at', 'desc')
            ->get();
    @endphp

    @if($allPayments->count() > 0)
    <h3 style="margin-top: 30px;">Payment History</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
        <thead>
            <tr style="background: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 4px;">Date</th>
                <th style="border: 1px solid #ddd; padding: 4px;">Amount</th>
                <th style="border: 1px solid #ddd; padding: 4px;">Method</th>
                <th style="border: 1px solid #ddd; padding: 4px;">Reference</th>
            </tr>
        </thead>
        <tbody>
            @foreach($allPayments as $payment)
            <tr>
                <td style="border: 1px solid #ddd; padding: 4px;">{{ $payment->paid_at ? $payment->paid_at->format('M d, Y') : 'N/A' }}</td>
                <td style="border: 1px solid #ddd; padding: 4px;">{{ number_format($payment->amount, 2) }} {{ $currency }}</td>
                <td style="border: 1px solid #ddd; padding: 4px;">{{ ucfirst($payment->method ?? 'N/A') }}</td>
                <td style="border: 1px solid #ddd; padding: 4px;">{{ $payment->reference ?? 'N/A' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <p style="margin-top:30px; font-size:10px; color:#666;">Generated on {{ now() }}</p>
</body>
</html>
