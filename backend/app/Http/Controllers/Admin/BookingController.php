<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Customer;
use App\Models\JobCard;
use App\Models\JobCardItem;
use App\Models\Package;
use App\Models\Payment;
use App\Models\FooterRule;
use App\Models\Reminder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Booking::with(['customer', 'package'])
            ->where('user_id', $user->id)
            ->orderByDesc('id'); // Temporary ordering, will be updated to use earliest date
        if ($search = $request->query('q')) {
            $query->where(function ($q2) use ($search) {
                $q2->where('location', 'like', "%$search%")
                   ->orWhere('status', 'like', "%$search%")
                   ->orWhere('notes', 'like', "%$search%");
            });
        }
        return $query->paginate((int) $request->query('per_page', 10));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'customer_id' => ['required','integer','exists:customers,id'],
            'package_id' => ['required','integer','exists:packages,id'],
            'location' => ['nullable','string','max:255'],
            'status' => ['nullable','string','in:scheduled,completed,cancelled'],
            'notes' => ['nullable','string'],
            'wedding_shoot_date' => ['nullable','date'],
            'preshoot_date' => ['nullable','date'],
            'homecoming_date' => ['nullable','date'],
            'function_date' => ['nullable','date'],
            'event_covering_date' => ['nullable','date'],
            'custom_plan_date' => ['nullable','date'],
            'wedding_shoot_location' => ['nullable','string','max:255'],
            'preshoot_location' => ['nullable','string','max:255'],
            'homecoming_location' => ['nullable','string','max:255'],
            'function_location' => ['nullable','string','max:255'],
            'event_covering_location' => ['nullable','string','max:255'],
            'custom_plan_location' => ['nullable','string','max:255'],
            'advance_payment' => ['nullable','numeric','min:0'],
            'transport_charges' => ['nullable','numeric','min:0'],
            // Optional items array to allow customizing package and adding extra items at creation
            'items' => ['nullable','array'],
            'items.*.item_id' => ['required_with:items','integer','exists:items,id'],
            'items.*.quantity' => ['required_with:items','integer','min:1'],
            'items.*.unit_price' => ['required_with:items','numeric','min:0'],
        ]);

        // Ensure the customer belongs to user
        $customer = Customer::where('id', $data['customer_id'])->where('user_id', $user->id)->firstOrFail();
        $data['user_id'] = $user->id;

        $booking = Booking::create($data);

        // Create booking items
        // If explicit items were provided, use them (supports modified quantities/prices and extra items)
        // Otherwise, fall back to the package's default items
        if (!empty($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $reqItem) {
                $qty = (int) ($reqItem['quantity'] ?? 1);
                $price = (float) ($reqItem['unit_price'] ?? 0);
                BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_id' => $reqItem['item_id'],
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'subamount' => $qty * $price,
                ]);
            }
        } else {
            $package = Package::with('packageItems.item')->find($booking->package_id);
            if ($package && $package->packageItems) {
                foreach ($package->packageItems as $packageItem) {
                    // Only create booking item if the package item has a valid item
                    if ($packageItem->item) {
                        BookingItem::create([
                            'booking_id' => $booking->id,
                            'item_id' => $packageItem->item_id,
                            'quantity' => $packageItem->quantity,
                            'unit_price' => $packageItem->unit_price,
                            'subamount' => $packageItem->subamount,
                        ]);
                    }
                }
            }
        }

        // Create job card automatically
        $earliestDate = $booking->getEarliestDate();
        // If items were provided, use the sum of booking items; otherwise, use the package total as before
        $booking->load('bookingItems');
        $itemsTotal = $booking->bookingItems->sum(function ($bi) { return (float) $bi->subamount; });
        $confirmedAmount = $itemsTotal > 0 ? $itemsTotal : ($booking->package?->total_price ?? 0);

        $jobCard = JobCard::create([
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'title' => 'Job Card for ' . ($customer->name ?? 'Customer #' . $customer->id) . ' - ' . ($earliestDate ? $earliestDate->format('M d, Y') : 'TBD'),
            'description' => 'Automatically created job card for booking #' . $booking->id,
            'status' => 'in_progress',
            'due_date' => $earliestDate,
            'confirmed_amount' => $confirmedAmount,
            'advance_payment' => $booking->advance_payment,
            'transport_charges' => $booking->transport_charges,
        ]);

        // Create job card items from booking items
        $booking->load('bookingItems.item');
        foreach ($booking->bookingItems as $bookingItem) {
            JobCardItem::create([
                'job_card_id' => $jobCard->id,
                'service' => $bookingItem->item->name . ' (' . $bookingItem->item->code . ')',
                'qty' => $bookingItem->quantity,
                'amount' => $bookingItem->unit_price,
                'sub_amount' => $bookingItem->subamount,
            ]);
        }

        // Create payment record for advance payment if provided
        if (!empty($data['advance_payment']) && $data['advance_payment'] > 0) {
            Payment::create([
                'user_id' => $user->id,
                'customer_id' => $data['customer_id'],
                'booking_id' => $booking->id,
                'job_card_id' => $jobCard->id,
                'amount' => $data['advance_payment'],
                'currency' => $user->currency ?? 'USD',
                'method' => 'advance',
                'status' => 'paid',
                'paid_at' => now(),
            ]);
        }

        return response()->json($booking->load(['customer']), 201);
    }

    public function show(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $booking->load(['customer', 'package.packageItems.item', 'bookingItems.item']);

        $bookingData = $booking->toArray();

        // Transform package items for frontend compatibility if package exists
        if ($booking->package && $booking->package->packageItems) {
            $bookingData['package']['items'] = collect($booking->package->packageItems)->map(function ($packageItem) {
                return [
                    'id' => $packageItem->id,
                    'item_id' => $packageItem->item_id,
                    'item' => $packageItem->item,
                    'quantity' => $packageItem->quantity,
                    'unit_price' => $packageItem->unit_price,
                    'subamount' => $packageItem->subamount,
                ];
            });
        }

        return $bookingData;
    }

    public function update(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $data = $request->validate([
            'customer_id' => ['sometimes','integer','exists:customers,id'],
            'package_id' => ['nullable','integer','exists:packages,id'],
            'location' => ['nullable','string','max:255'],
            'status' => ['nullable','string','in:scheduled,completed,cancelled'],
            'notes' => ['nullable','string'],
            'wedding_shoot_date' => ['nullable','date'],
            'preshoot_date' => ['nullable','date'],
            'homecoming_date' => ['nullable','date'],
            'function_date' => ['nullable','date'],
            'event_covering_date' => ['nullable','date'],
            'custom_plan_date' => ['nullable','date'],
            'wedding_shoot_location' => ['nullable','string','max:255'],
            'preshoot_location' => ['nullable','string','max:255'],
            'homecoming_location' => ['nullable','string','max:255'],
            'function_location' => ['nullable','string','max:255'],
            'event_covering_location' => ['nullable','string','max:255'],
            'custom_plan_location' => ['nullable','string','max:255'],
            'advance_payment' => ['sometimes','numeric','min:0'],
            'transport_charges' => ['sometimes','numeric','min:0'],
            'booking_items' => ['sometimes','array'],
            'booking_items.*.id' => ['nullable','integer','exists:booking_items,id'],
            'booking_items.*.item_id' => ['required','integer','exists:items,id'],
            'booking_items.*.quantity' => ['required','integer','min:1'],
            'booking_items.*.unit_price' => ['required','numeric','min:0'],
            'booking_items.*.subamount' => ['required','numeric','min:0'],
        ]);

        if (isset($data['customer_id'])) {
            $user = $request->user();
            Customer::where('id', $data['customer_id'])->where('user_id', $user->id)->firstOrFail();
        }
        $booking->update($data);

        // Handle booking items updates
        if (isset($data['booking_items'])) {
            $this->updateBookingItems($booking, $data['booking_items'], $request->user());
        }

        // Handle advance payment changes
        if (isset($data['advance_payment'])) {
            $jobCard = JobCard::where('booking_id', $booking->id)->first();
            
            if ($jobCard) {
                // Update job card advance payment
                $jobCard->update(['advance_payment' => $data['advance_payment']]);
                
                // Remove existing advance payment records
                Payment::where('booking_id', $booking->id)
                    ->where('method', 'advance')
                    ->delete();
                
                // Create new payment record if advance payment > 0
                if ($data['advance_payment'] > 0) {
                    Payment::create([
                        'user_id' => $request->user()->id,
                        'customer_id' => $booking->customer_id,
                        'booking_id' => $booking->id,
                        'job_card_id' => $jobCard->id,
                        'amount' => $data['advance_payment'],
                        'currency' => $request->user()->currency ?? 'USD',
                        'method' => 'advance',
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);
                }
            }
        }

        return $booking->load(['customer']);
    }

    private function updateBookingItems(Booking $booking, array $bookingItemsData, $user)
    {
        $keptIds = [];

        // Upsert booking items
        foreach ($bookingItemsData as $itemData) {
            if (!empty($itemData['id'])) {
                $bookingItem = BookingItem::where('id', $itemData['id'])
                    ->where('booking_id', $booking->id)
                    ->first();
                if ($bookingItem) {
                    $bookingItem->update([
                        'item_id' => $itemData['item_id'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'subamount' => $itemData['subamount'],
                    ]);
                    $keptIds[] = $bookingItem->id;
                }
            } else {
                $created = BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_id' => $itemData['item_id'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'subamount' => $itemData['subamount'],
                ]);
                $keptIds[] = $created->id;
            }
        }

        // Delete removed booking items
        BookingItem::where('booking_id', $booking->id)
            ->whereNotIn('id', $keptIds)
            ->delete();

        // Sync job card items to exactly match booking items
        $jobCard = JobCard::where('booking_id', $booking->id)->first();
        if ($jobCard) {
            // Rebuild job card items based on current booking items
            JobCardItem::where('job_card_id', $jobCard->id)->delete();

            $booking->load('bookingItems.item');
            foreach ($booking->bookingItems as $bi) {
                JobCardItem::create([
                    'job_card_id' => $jobCard->id,
                    'service' => $bi->item->name . ' (' . $bi->item->code . ')',
                    'qty' => $bi->quantity,
                    'amount' => $bi->unit_price,
                    'sub_amount' => $bi->subamount,
                ]);
            }

            // Update confirmed amount to reflect sum of booking items
            $confirmed = $booking->bookingItems->sum(function ($x) { return (float) $x->subamount; });
            if ($confirmed > 0) {
                $jobCard->update(['confirmed_amount' => $confirmed]);
            }
        }
    }

    public function destroy(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $booking->delete();
        return response()->json(['status' => 'deleted']);
    }

    /**
     * Return bookings within a date range for calendar views.
     */
    public function calendar(Request $request)
    {
        $user = $request->user();
        $start = $request->query('start');
        $end = $request->query('end');
        $request->validate([
            'start' => ['required','date'],
            'end' => ['required','date','after_or_equal:start'],
        ]);

        $bookings = Booking::with('customer')
            ->where('user_id', $user->id)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('wedding_shoot_date', [$start, $end])
                  ->orWhereBetween('preshoot_date', [$start, $end])
                  ->orWhereBetween('homecoming_date', [$start, $end])
                  ->orWhereBetween('function_date', [$start, $end])
                  ->orWhereBetween('event_covering_date', [$start, $end])
                  ->orWhereBetween('custom_plan_date', [$start, $end]);
            })
            ->orderBy('id', 'asc') // Temporary ordering
            ->get();

        $events = [];
        foreach ($bookings as $booking) {
            $dates = [
                'wedding_shoot_date' => ['Wedding Shoot', 'wedding_shoot_location'],
                'preshoot_date' => ['Preshoot Day', 'preshoot_location'],
                'homecoming_date' => ['Home Coming Day Shoot', 'homecoming_location'],
                'function_date' => ['Function', 'function_location'],
                'event_covering_date' => ['Event Covering', 'event_covering_location'],
                'custom_plan_date' => ['Custom Plan', 'custom_plan_location'],
            ];
            foreach ($dates as $field => $info) {
                if ($booking->$field && $booking->$field >= $start && $booking->$field <= $end) {
                    $location = $booking->{$info[1]} ? ' @ ' . $booking->{$info[1]} : '';
                    $events[] = [
                        'id' => $booking->id . '_' . $field,
                        'booking_id' => $booking->id,
                        'title' => ($booking->customer?->name ? $booking->customer->name : '#'.$booking->customer_id) . ' — ' . $info[0] . ' (' . $booking->status . ')' . $location,
                        'start' => $booking->$field->toISOString(),
                        'end' => $booking->$field->copy()->addHours(1)->toISOString(),
                        'resource' => $booking->toArray(),
                        'type' => $field,
                    ];
                }
            }
        }

        return response()->json($events);
    }

    /**
     * Get the next upcoming booking from now.
     */
    public function nextBooking(Request $request)
    {
        $user = $request->user();

        $bookings = Booking::with('customer')
            ->where('user_id', $user->id)
            ->get();

        // Filter bookings that have at least one future date and find the one with the earliest date
        $futureBookings = $bookings->filter(function ($booking) {
            $earliestDate = $booking->getEarliestDate();
            return $earliestDate && $earliestDate > now();
        })->sortBy(function ($booking) {
            return $booking->getEarliestDate();
        });

        $nextBooking = $futureBookings->first();

        return response()->json($nextBooking);
    }

    private function authorizeAccess(Request $request, Booking $booking): void
    {
        abort_if($booking->user_id !== $request->user()->id, 403);
    }

    /**
     * Mark a reminder as sent now for a booking (creates a reminder record).
     */
    public function sendReminder(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $user = $request->user();
        $reminder = Reminder::create([
            'user_id' => $user->id,
            'customer_id' => $booking->customer_id,
            'booking_id' => $booking->id,
            'title' => 'Booking reminder #'.$booking->id,
            'remind_at' => Carbon::now(),
            'sent' => true,
        ]);
        return response()->json($reminder->load(['customer','booking']), 201);
    }

    /**
     * Generate a Booking Confirmation PDF that summarizes items and mentions
     * Advance Payment and Transport Charges when present.
     */
    public function confirmationReport(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $booking->load(['customer', 'bookingItems.item', 'package']);

        $user = $request->user();
        $currency = $user->currency ?? 'USD';
        $currencySymbol = $this->getCurrencySymbol($currency);

        // Prepare logo (embedded base64 if available)
        $logoSrc = null;
        if ($user && $user->logo_path) {
            $logoPath = storage_path('app/public/' . $user->logo_path);
            if (file_exists($logoPath)) {
                $logoData = file_get_contents($logoPath);
                $mimeType = mime_content_type($logoPath);
                $logoSrc = 'data:' . $mimeType . ';base64,' . base64_encode($logoData);
            }
        }

        $itemsTotal = $booking->bookingItems->sum(function ($bi) { return (float) $bi->subamount; });
        $advance = (float)($booking->advance_payment ?? 0);
        $transport = (float)($booking->transport_charges ?? 0);
        // Compute base total without subtracting advance to avoid double-counting
        $totalDue = $itemsTotal + $transport;

        $earliest = $booking->getEarliestDate();
        $eventDateStr = $earliest ? $earliest->format('Y-m-d H:i') : 'TBD';

        // Footer rules
        $footerRules = FooterRule::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        // Rich HTML styled similar to invoice report
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Booking Confirmation #'.$booking->id.'</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color:#111827; }
                .header { margin-bottom: 20px; }
                .logo-section { text-align: center; margin-bottom: 12px; }
                .logo { height: 90px; max-width: 280px; margin-bottom: 10px; }
                .company-info { text-align: center; }
                .company-info h2 { margin: 0 0 4px 0; font-size: 18px; }
                .company-info p { margin: 2px 0; font-size: 12px; color: #666; }
                .doc-title { margin: 16px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 8px 0; }
                .doc-title-content { display: flex; justify-content: space-between; align-items: center; }
                .doc-title h1 { margin: 0; font-size: 22px; font-weight: bold; }
                .doc-number { font-size: 13px; font-weight: bold; color: #333; }
                .details-row { display: flex; margin-bottom: 16px; border: 1px solid #ddd; }
                .details-column { flex: 1; padding: 10px; border-right: 1px solid #ddd; }
                .details-column:last-child { border-right: none; }
                .details-column h3 { margin: 0 0 6px 0; font-size: 11px; color: #333; text-transform: uppercase; font-weight: bold; }
                .details-column p { margin: 2px 0; font-size: 10px; line-height: 1.35; color: #555; }
                .details-column strong { font-weight: bold; color: #333; }
                .items-table { width: 100%; border-collapse: collapse; margin: 12px 0; border: 2px solid #333; }
                .items-table th { background: #f3f4f6; color: #111; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; border: 1px solid #555; }
                .items-table td { padding: 10px; border: 1px solid #ddd; font-size: 12px; }
                .items-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
                .items-table tbody tr:hover { background-color: #e3f2fd; }
                .totals { margin: 12px 0; padding: 10px; background: #f5f7fa; border: 2px solid #333; border-radius: 5px; }
                .totals p { margin: 6px 0; font-size: 12px; font-weight: bold; color: #333; }
                .badge { display:inline-block; padding:2px 6px; border-radius:6px; font-size:11px; margin-left:4px }
                .badge-adv { background:#dcfce7; color:#166534 }
                .badge-trp { background:#dbeafe; color:#1e40af }
                .footer { margin-top: 16px; border-top: 2px solid #333; padding-top: 8px; }
                .footer-rule { margin-bottom: 6px; font-size: 12px; color: #555; padding: 8px; background: #f8f9fa; border-left: 4px solid #667eea; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    ' . ($logoSrc ? '<img src="'.$logoSrc.'" alt="Logo" class="logo" />' : '') . '
                    <div class="company-info">
                        <h2>' . e($user->name ?? 'Company') . '</h2>
                        ' . ($user->address ? '<p>'.e($user->address).'</p>' : '') . '
                        <p>
                            ' . ($user->phone ? 'Phone: '.e($user->phone) : '') .
                            ($user->email ? ' | Email: '.e($user->email) : '') .
                            ($user->website ? ' | Website: '.e($user->website) : '') . '
                        </p>
                    </div>
                </div>
                <div class="doc-title">
                    <div class="doc-title-content">
                        <h1>BOOKING CONFIRMATION</h1>
                        <div class="doc-number">Booking #: '.$booking->id.' • Event: '.$eventDateStr.'</div>
                    </div>
                </div>
            </div>

            <div class="details-row">
                <div class="details-column">
                    <h3>Customer Details</h3>
                    <p><strong>Name:</strong> ' . e($booking->customer->name ?? 'N/A') . ', <strong>Email:</strong> ' . e($booking->customer->email ?? 'N/A') . ', <strong>Phone:</strong> ' . e($booking->customer->phone ?? 'N/A') . ', <strong>Address:</strong> ' . e($booking->customer->address ?? 'N/A') . '</p>
                </div>
                <div class="details-column">
                    <h3>Booking Details</h3>
                    <p><strong>Booking ID:</strong> ' . $booking->id . '</p>
                    ' . ($booking->package ? '<p><strong>Package:</strong> '.e($booking->package->name).' ('.($currencySymbol.number_format((float)($booking->package->total_price ?? 0), 2)).')</p>' : '') . '
                    <p><strong>Notes:</strong> ' . e($booking->notes ?? '—') . '</p>
                </div>
            </div>
        ';

        // Event schedule details
        $eventDetails = [];
        if ($booking->wedding_shoot_date) {
            $eventDetails[] = '<strong>Wedding Shoot:</strong> ' . \Carbon\Carbon::parse($booking->wedding_shoot_date)->format('Y-m-d') . ($booking->wedding_shoot_location ? ' at ' . e($booking->wedding_shoot_location) : '');
        }
        if ($booking->preshoot_date) {
            $eventDetails[] = '<strong>Pre-shoot:</strong> ' . \Carbon\Carbon::parse($booking->preshoot_date)->format('Y-m-d') . ($booking->preshoot_location ? ' at ' . e($booking->preshoot_location) : '');
        }
        if ($booking->homecoming_date) {
            $eventDetails[] = '<strong>Homecoming:</strong> ' . \Carbon\Carbon::parse($booking->homecoming_date)->format('Y-m-d') . ($booking->homecoming_location ? ' at ' . e($booking->homecoming_location) : '');
        }
        if ($booking->function_date) {
            $eventDetails[] = '<strong>Function:</strong> ' . \Carbon\Carbon::parse($booking->function_date)->format('Y-m-d') . ($booking->function_location ? ' at ' . e($booking->function_location) : '');
        }
        if ($booking->event_covering_date) {
            $eventDetails[] = '<strong>Event Covering:</strong> ' . \Carbon\Carbon::parse($booking->event_covering_date)->format('Y-m-d') . ($booking->event_covering_location ? ' at ' . e($booking->event_covering_location) : '');
        }
        if ($booking->custom_plan_date) {
            $eventDetails[] = '<strong>Custom Plan:</strong> ' . \Carbon\Carbon::parse($booking->custom_plan_date)->format('Y-m-d') . ($booking->custom_plan_location ? ' at ' . e($booking->custom_plan_location) : '');
        }
        if (!empty($eventDetails)) {
            $html .= '<div class="details-row"><div class="details-column" style="flex:1">'
                   . '<h3>Event Schedule</h3>'
                   . '<p>' . implode(' • ', $eventDetails) . '</p>'
                   . '</div></div>';
        }

        // Items table (package/custom items already synced into booking items)
        $html .= '
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th style="width:12%">Qty</th>
                        <th style="width:18%">Rate ('.$currencySymbol.')</th>
                        <th style="width:18%">Amount ('.$currencySymbol.')</th>
                    </tr>
                </thead>
                <tbody>';

        foreach ($booking->bookingItems as $bi) {
            $code = e($bi->item?->code ?? 'N/A');
            $name = e($bi->item?->name ?? 'Item');
            $qty = (int) $bi->quantity;
            $unit = number_format((float)$bi->unit_price, 2);
            $sub = number_format((float)$bi->subamount, 2);
            $html .= '<tr><td>'.$code.'</td><td>'.$name.'</td><td>'.$qty.'</td><td>'.$currencySymbol.$unit.'</td><td>'.$currencySymbol.$sub.'</td></tr>';
        }
        if ($booking->bookingItems->count() === 0) {
            $html .= '<tr><td colspan="5" style="text-align:center;color:#6b7280">No items</td></tr>';
        }

        $html .= '
                </tbody>
            </table>';

        // Totals and payments
        $html .= '
            <div class="totals">'
                . '<p><strong>Items Total:</strong> ' . $currencySymbol . number_format($itemsTotal, 2) . '</p>';
        if ($transport > 0) {
            $html .= '<p><strong>Transport Charges:</strong> ' . $currencySymbol . number_format($transport, 2) . ' <span class="badge badge-trp">Transport</span></p>';
        }
        // Show advance payment details via payments summary; do not subtract here to prevent double count
        // Sum all paid payments for this booking
        $paidAmount = Payment::where('booking_id', $booking->id)->where('status','paid')->sum('amount');
        if ($paidAmount > 0) {
            $html .= '<p><strong>Total Paid:</strong> -' . $currencySymbol . number_format($paidAmount, 2) . '</p>';
            $lastPayment = Payment::where('booking_id', $booking->id)->where('status','paid')->orderByDesc('paid_at')->first();
            if ($lastPayment) {
                $html .= '<p><strong>Last Payment:</strong> ' . $currencySymbol . number_format((float)$lastPayment->amount, 2) . ' (' . ($lastPayment->paid_at ? $lastPayment->paid_at->format('Y-m-d') : '-') . ' via ' . e($lastPayment->method ?? 'N/A') . ')</p>';
            }
        }
        $html .= '<p><strong>Total Due:</strong> ' . $currencySymbol . number_format(max(0, $totalDue - $paidAmount), 2) . '</p>';
        $html .= '</div>';

        // Footer rules
        if ($footerRules->count() > 0) {
            $html .= '<div class="footer">';
            foreach ($footerRules as $rule) {
                $html .= '<div class="footer-rule"><strong>' . e($rule->title) . ':</strong> ' . e($rule->content) . '</div>';
            }
            $html .= '</div>';
        }

        $html .= '
        </body>
        </html>';

        // Render PDF
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Arial');
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        $filename = 'booking_confirmation_'.$booking->id.'.pdf';
        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    private function getCurrencySymbol($currency)
    {
        $symbols = [
            'USD' => '$', 'EUR' => '€', 'GBP' => '£', 'JPY' => '¥', 'CAD' => 'C$', 'AUD' => 'A$', 'CHF' => 'CHF',
            'CNY' => '¥', 'INR' => '₹', 'BRL' => 'R$', 'MXN' => '$', 'RUB' => '₽', 'KRW' => '₩', 'SGD' => 'S$', 'HKD' => 'HK$',
            'NZD' => 'NZ$', 'SEK' => 'kr', 'NOK' => 'kr', 'DKK' => 'kr', 'PLN' => 'zł', 'CZK' => 'Kč', 'HUF' => 'Ft', 'TRY' => '₺',
            'ZAR' => 'R', 'EGP' => '£', 'SAR' => '﷼', 'AED' => 'د.إ', 'THB' => '฿', 'MYR' => 'RM', 'IDR' => 'Rp', 'PHP' => '₱', 'VND' => '₫',
        ];
        return $symbols[$currency] ?? $currency;
    }
}
