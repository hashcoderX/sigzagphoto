<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Balance Sheet</title>
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
        .section { margin-top: 14px; }
        .section h3 { margin: 0 0 6px 0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; border: 1px solid #555; padding: 8px; text-align: left; font-size: 12px; }
        td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        .right { text-align: right; }
        .summary { display: flex; gap: 10px; margin-top: 8px; }
        .card { flex: 1; border: 2px solid #333; padding: 10px; border-radius: 6px; background: #f9fafb; }
        .muted { color: #6b7280; font-size: 11px; }
    </style>
</head>
<body>
@php
    $u = isset($brand) ? $brand : null;
    $currency = ($u && $u->currency) ? $u->currency : 'USD';
    $logo = ($u && $u->logo_path) ? asset('storage/'.$u->logo_path) : null;
    $period = ($startDate && $endDate) ? ($startDate->format('Y-m-d').' to '.$endDate->format('Y-m-d')) : 'All Time';
    $netColor = ($net >= 0) ? '#065f46' : '#7f1d1d';
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
        <h1>Balance Sheet</h1>
        <div class="doc-number">Period: {{ $period }}</div>
    </div>
</div>

<div class="summary">
    <div class="card">
        <div class="muted">Income</div>
        <div style="font-weight:700; font-size:16px; color:#065f46;">{{ number_format($totalIncome, 2) }} {{ $currency }}</div>
    </div>
    <div class="card">
        <div class="muted">Expenses</div>
        <div style="font-weight:700; font-size:16px; color:#7f1d1d;">{{ number_format($totalExpense, 2) }} {{ $currency }}</div>
    </div>
    <div class="card">
        <div class="muted">Net</div>
        @if($net >= 0)
            <div style="font-weight:700; font-size:16px; color:#065f46;">{{ number_format($net, 2) }} {{ $currency }}</div>
        @else
            <div style="font-weight:700; font-size:16px; color:#7f1d1d;">{{ number_format($net, 2) }} {{ $currency }}</div>
        @endif
    </div>
</div>

<div class="section">
    <h3>Income (Payments + Income Entries)</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 18%">Date</th>
                <th style="width: 42%">Source</th>
                <th style="width: 30%">Details</th>
                <th class="right" style="width: 10%">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($payments as $p)
                <tr>
                    <td>{{ ($p->paid_at ?? $p->created_at)?->format('Y-m-d') }}</td>
                    <td>Payment #{{ $p->id }}</td>
                    <td>{{ $p->customer?->name ? ('Customer: '.$p->customer->name) : '-' }}</td>
                    <td class="right">{{ number_format($p->amount, 2) }} {{ $p->currency ?? $currency }}</td>
                </tr>
            @endforeach
            @foreach($entries->where('type','income') as $e)
                <tr>
                    <td>{{ $e->date?->format('Y-m-d') }}</td>
                    <td>Entry (Income)</td>
                    <td>{{ $e->category ?? '-' }} @if($e->notes) — {{ $e->notes }} @endif</td>
                    <td class="right">{{ number_format($e->amount, 2) }} {{ $currency }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="right" style="font-weight:700;">Total Income</td>
                <td class="right" style="font-weight:700;">{{ number_format($totalIncome, 2) }} {{ $currency }}</td>
            </tr>
        </tfoot>
    </table>
</div>

<div class="section">
    <h3>Expenses (General + Job Card)</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 18%">Date</th>
                <th style="width: 42%">Category / Event</th>
                <th style="width: 30%">Details</th>
                <th class="right" style="width: 10%">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($entries->where('type','expense') as $e)
                <tr>
                    <td>{{ $e->date?->format('Y-m-d') }}</td>
                    <td>{{ $e->category ?? 'General' }}</td>
                    <td>{{ $e->notes ?? '-' }}</td>
                    <td class="right">{{ number_format($e->amount, 2) }} {{ $currency }}</td>
                </tr>
            @endforeach
            @foreach($jobCardExpenses as $jc)
                <tr>
                    <td>{{ $jc->expense_date?->format('Y-m-d') }}</td>
                    <td>{{ $jc->event_type }}</td>
                    <td>
                        @if($jc->jobCard) Job Card #{{ $jc->jobCard->id }} — {{ $jc->jobCard->title }}<br/> @endif
                        {{ $jc->description }} @if($jc->vendor) (Vendor: {{ $jc->vendor }}) @endif
                    </td>
                    <td class="right">{{ number_format($jc->amount, 2) }} {{ $currency }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="right" style="font-weight:700;">Total Expense</td>
                <td class="right" style="font-weight:700;">{{ number_format($totalExpense, 2) }} {{ $currency }}</td>
            </tr>
        </tfoot>
    </table>
</div>

<p class="muted" style="margin-top: 18px;">Generated on {{ now()->format('Y-m-d H:i') }}</p>
</body>
</html>
