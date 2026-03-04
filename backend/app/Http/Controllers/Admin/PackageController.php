<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Item;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Package::where('user_id', $user->id)->with(['packageItems.item'])->orderByDesc('id');
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            });
        }
        
        $packages = $query->paginate((int) $request->query('per_page', 10));
        
        // Calculate total_price for each package and transform items
        $packages->getCollection()->transform(function ($package) {
            $package->total_price = $package->packageItems->sum(function ($packageItem) {
                return ($packageItem->unit_price ?? 0) * $packageItem->quantity;
            });
            // Transform packageItems to items format for frontend compatibility
            $package->items = $package->packageItems->map(function ($packageItem) {
                return [
                    'id' => $packageItem->id,
                    'item_id' => $packageItem->item_id,
                    'item' => $packageItem->item,
                    'quantity' => $packageItem->quantity,
                    'unit_price' => $packageItem->unit_price,
                    'subamount' => $packageItem->subamount,
                ];
            });
            return $package;
        });

        return $packages;
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required','string','max:255'],
            'description' => ['nullable','string'],
            'notes' => ['nullable','string'],
            'items' => ['required','array','min:1'],
            'items.*.item_id' => ['required','integer','exists:items,id'],
            'items.*.quantity' => ['required','integer','min:1'],
        ]);

        // Convert empty strings to null for nullable fields
        foreach (['description', 'notes'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        $data['user_id'] = $user->id;
        $packageData = collect($data)->except(['items'])->toArray();
        $package = Package::create($packageData);

        // Create package items
        $packageItems = collect($data['items'])->map(function ($item) use ($package) {
            $itemModel = Item::find($item['item_id']);
            $unitPrice = $itemModel->price ?? 0;
            $subamount = $unitPrice * $item['quantity'];
            
            return [
                'package_id' => $package->id,
                'item_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $unitPrice,
                'subamount' => $subamount,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->toArray();

        PackageItem::insert($packageItems);

        // Load the package with items and calculate total price
        $package->load(['packageItems.item']);
        $totalPrice = $package->packageItems->sum(function ($packageItem) {
            return ($packageItem->unit_price ?? 0) * $packageItem->quantity;
        });
        
        // Update the package with the calculated total price
        $package->update(['price' => $totalPrice]);
        
        $packageData = $package->toArray();
        $packageData['total_price'] = $totalPrice;

        return response()->json($packageData, 201);
    }

    public function show(Request $request, Package $package)
    {
        $this->authorizeAccess($request, $package);
        $package->load(['packageItems.item']);
        
        // Calculate and set total_price using stored values
        $totalPrice = $package->packageItems->sum(function ($packageItem) {
            return ($packageItem->unit_price ?? 0) * $packageItem->quantity;
        });
        
        $packageData = $package->toArray();
        $packageData['total_price'] = $totalPrice;
        
        // Transform packageItems to items format for frontend compatibility
        $packageData['items'] = collect($package->packageItems)->map(function ($packageItem) {
            return [
                'id' => $packageItem->id,
                'item_id' => $packageItem->item_id,
                'item' => $packageItem->item,
                'quantity' => $packageItem->quantity,
                'unit_price' => $packageItem->unit_price,
                'subamount' => $packageItem->subamount,
            ];
        });

        return $packageData;
    }

    public function update(Request $request, Package $package)
    {
        $this->authorizeAccess($request, $package);

        $data = $request->validate([
            'name' => ['sometimes','required','string','max:255'],
            'description' => ['nullable','string'],
            'notes' => ['nullable','string'],
            'items' => ['sometimes','array','min:1'],
            'items.*.item_id' => ['required','integer','exists:items,id'],
            'items.*.quantity' => ['required','integer','min:1'],
            'items.*.unit_price' => ['sometimes','numeric','min:0'],
        ]);

        // Convert empty strings to null for nullable fields
        foreach (['description', 'notes'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        $packageData = collect($data)->except(['items'])->toArray();
        $package->update($packageData);

        // Update package items if provided
        if (isset($data['items'])) {
            // Delete existing items
            $package->packageItems()->delete();

            // Create new items
            $packageItems = collect($data['items'])->map(function ($item) use ($package) {
                // Use unit_price from request if provided, otherwise fall back to item price
                $unitPrice = isset($item['unit_price']) ? $item['unit_price'] : (Item::find($item['item_id'])->price ?? 0);
                $subamount = $unitPrice * $item['quantity'];
                
                return [
                    'package_id' => $package->id,
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'subamount' => $subamount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->toArray();

            PackageItem::insert($packageItems);
        }

        // Load the package with items and calculate total price
        $package->load(['packageItems.item']);
        $totalPrice = $package->packageItems->sum(function ($packageItem) {
            return ($packageItem->unit_price ?? 0) * $packageItem->quantity;
        });
        
        // Update the package with the calculated total price
        $package->update(['price' => $totalPrice]);
        
        $packageData = $package->toArray();
        $packageData['total_price'] = $totalPrice;
        
        // Transform packageItems to items format for frontend compatibility
        $packageData['items'] = collect($package->packageItems)->map(function ($packageItem) {
            return [
                'id' => $packageItem->id,
                'item_id' => $packageItem->item_id,
                'item' => $packageItem->item,
                'quantity' => $packageItem->quantity,
                'unit_price' => $packageItem->unit_price,
                'subamount' => $packageItem->subamount,
            ];
        });

        return $packageData;
    }

    public function destroy(Request $request, Package $package)
    {
        $this->authorizeAccess($request, $package);
        $package->delete();
        return response()->json(['status' => 'deleted']);
    }

    private function authorizeAccess(Request $request, Package $package): void
    {
        abort_if($package->user_id !== $request->user()->id, 403);
    }
}
