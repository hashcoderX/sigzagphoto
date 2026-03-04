<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'price',
        'notes',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    protected $appends = ['total_price'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function packageItems()
    {
        return $this->hasMany(PackageItem::class);
    }

    public function items()
    {
        return $this->belongsToMany(Item::class, 'package_items')
                    ->withPivot('quantity')
                    ->withTimestamps();
    }

    public function getTotalPriceAttribute()
    {
        return $this->packageItems->sum(function ($packageItem) {
            return ($packageItem->unit_price ?? 0) * $packageItem->quantity;
        });
    }
}
