<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Payment Receipt #{{ $payment->id }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; margin: 0; padding: 20px; }
        .logo-section { text-align: center; margin-bottom: 12px; }
        .logo { height: 80px; max-width: 260px; margin-bottom: 8px; }
        .company-info { text-align: center; }
        .company-info h2 { margin: 0 0 4px 0; font-size: 18px; }
        .company-info p { margin: 2px 0; font-size: 11px; color: #6b7280; }
        .doc-title { margin: 16px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 8px 0; }
        .doc-title-content { display: flex; justify-content: space-between; align-items: center; }
        .doc-title h1 { margin: 0; font-size: 22px; font-weight: bold; }
        .doc-number { font-size: 12px; font-weight: bold; color: #333; }
        .details-row { display: flex; margin-bottom: 16px; border: 1px solid #ddd; }
        .details-column { flex: 1; padding: 10px; border-right: 1px solid #ddd; }
        .details-column:last-child { border-right: none; }
        .details-column h3 { margin: 0 0 6px 0; font-size: 11px; color: #333; text-transform: uppercase; font-weight: bold; }
        .details-column p { margin: 2px 0; font-size: 11px; line-height: 1.35; color: #374151; }
        .items-table { width: 100%; border-collapse: collapse; margin: 12px 0; border: 2px solid #333; }
        .items-table th { background: #f3f4f6; color: #111; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; border: 1px solid #555; }
        .items-table td { padding: 10px; border: 1px solid #ddd; font-size: 12px; }
        .totals { margin: 12px 0; padding: 10px; background: #f5f7fa; border: 2px solid #333; border-radius: 5px; }
        .totals p { margin: 6px 0; font-size: 12px; font-weight: bold; color: #333; }
        .footer { margin-top: 16px; border-top: 2px solid #333; padding-top: 8px; }
        .muted { color: #6b7280; font-size: 11px; }
    </style>
</head>
<body>
    @php
        $u = isset($brand) ? $brand : ($payment->jobCard->user ?? null);
        $currency = $payment->currency ?? ($u->currency ?? 'USD');
        $logo = $u && $u->logo_path ? asset('storage/'.$u->logo_path) : null;
        $paidAt = $payment->paid_at ? \Carbon\Carbon::parse($payment->paid_at)->format('Y-m-d H:i') : null;
    @endphp

    <div class="logo-section">
        @if($logo)
            <img src="{{ $logo }}" alt="Logo" class="logo" />
        @endif
        @if($u)
            <div class="company-info">
                <h2>{{ $u->name }}</h2>
                @if($u->address) <p>{{ $u->address }}</p> @endif
                <p>
                    @if($u->phone) <span>Phone: {{ $u->phone }}</span> @endif
                    @if($u->email) <span style="margin-left:8px;">Email: {{ $u->email }}</span> @endif
                    @if($u->website) <span style="margin-left:8px;">Website: {{ $u->website }}</span> @endif
                </p>
            </div>
        @endif
    </div>

    <div class="doc-title">
        <div class="doc-title-content">
            <h1>Payment Receipt</h1>
            <div class="doc-number">Receipt #: {{ $payment->id }}</div>
        </div>
    </div>

    <div class="details-row">
        <div class="details-column">
            <h3>Customer</h3>
            <p><strong>{{ $payment->customer?->name ?? ('#'.$payment->customer_id) }}</strong></p>
        </div>
        <div class="details-column">
            <h3>Payment</h3>
            <p><strong>Amount:</strong> {{ number_format($payment->amount, 2) }} {{ $currency }}</p>
            <p><strong>Status:</strong> {{ ucfirst($payment->status) }}</p>
            <p><strong>Method:</strong> {{ $payment->method ?? 'n/a' }}</p>
            <p><strong>Reference:</strong> {{ $payment->reference ?? '-' }}</p>
            <p><strong>Paid At:</strong> {{ $paidAt ?? '-' }}</p>
        </div>
        <div class="details-column">
            <h3>Links</h3>
            @if($payment->booking)
                <p><strong>Booking:</strong> #{{ $payment->booking->id }}</p>
            @elseif($payment->booking_id)
                <p><strong>Booking:</strong> #{{ $payment->booking_id }}</p>
            @endif
            @if($payment->jobCard)
                <p><strong>Job Card:</strong> #{{ $payment->jobCard->id }}</p>
            @elseif($payment->job_card_id)
                <p><strong>Job Card:</strong> #{{ $payment->job_card_id }}</p>
            @endif
            @if($payment->invoice_id)
                <p><strong>Invoice:</strong> #{{ $payment->invoice_id }}</p>
            @endif
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align:right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $payment->payment_type === 'transport' ? 'Transport Payment' : 'Advance / Confirmation Payment' }}</td>
                <td style="text-align:right;">{{ number_format($payment->amount, 2) }} {{ $currency }}</td>
            </tr>
        </tbody>
    </table>

    @if($payment->jobCard)
        @php
            $final = (float) ($payment->jobCard->confirmed_amount ?? 0);
            $paid = (float) \App\Models\Payment::where('job_card_id', $payment->jobCard->id)->where('status','paid')->sum('amount');
            $due = max(0, $final - $paid);
        @endphp
        <div class="totals">
            <p>Due Amount after this payment: {{ number_format($due, 2) }} {{ $currency }}</p>
        </div>
    @endif

    <div class="footer">
        <p class="muted">Generated on {{ now()->format('Y-m-d H:i') }}</p>
    </div>
</body>
</html>
