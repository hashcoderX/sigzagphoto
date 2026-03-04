<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'item_id',
        'quantity',
        'unit_price',
        'subamount',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subamount' => 'decimal:2',
    ];

    public function booking() { return $this->belongsTo(Booking::class); }
    public function item() { return $this->belongsTo(Item::class); }
}
