<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'customer_id',
        'package_id',
        'location',
        'status',
        'notes',
        'wedding_shoot_date',
        'preshoot_date',
        'homecoming_date',
        'function_date',
        'event_covering_date',
        'custom_plan_date',
        'wedding_shoot_location',
        'preshoot_location',
        'homecoming_location',
        'function_location',
        'event_covering_location',
        'custom_plan_location',
        'advance_payment',
        'transport_charges',
    ];

    protected $casts = [
        'wedding_shoot_date' => 'datetime',
        'preshoot_date' => 'datetime',
        'homecoming_date' => 'datetime',
        'function_date' => 'datetime',
        'event_covering_date' => 'datetime',
        'custom_plan_date' => 'datetime',
        'advance_payment' => 'decimal:2',
        'transport_charges' => 'decimal:2',
    ];

    protected $appends = ['earliest_date'];

    public function user() { return $this->belongsTo(User::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
    public function package() { return $this->belongsTo(Package::class); }
    public function bookingItems() { return $this->hasMany(BookingItem::class); }

    /**
     * Get the earliest date among all booking date fields
     */
    public function getEarliestDate()
    {
        $dates = [
            $this->wedding_shoot_date,
            $this->preshoot_date,
            $this->homecoming_date,
            $this->function_date,
            $this->event_covering_date,
            $this->custom_plan_date,
        ];

        $validDates = array_filter($dates, function ($date) {
            return $date !== null;
        });

        return $validDates ? min($validDates) : null;
    }

    /**
     * Get the earliest date attribute for sorting/querying
     */
    public function getEarliestDateAttribute()
    {
        return $this->getEarliestDate();
    }
}
