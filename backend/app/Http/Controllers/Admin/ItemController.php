<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Item::where('user_id', $user->id)->orderByDesc('id');
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('code', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            });
        }
        return $query->paginate((int) $request->query('per_page', 10));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'code' => ['required','string','max:100', Rule::unique('items')->where('user_id', $user->id)],
            'name' => ['required','string','max:255'],
            'description' => ['nullable','string'],
            'price' => ['nullable','numeric','min:0','max:99999999.99'],
            'notes' => ['nullable','string'],
        ]);

        // Convert empty strings to null for nullable fields
        foreach (['description', 'price', 'notes'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        $data['user_id'] = $user->id;
        $item = Item::create($data);
        return response()->json($item, 201);
    }

    public function show(Request $request, Item $item)
    {
        $this->authorizeAccess($request, $item);
        return $item;
    }

    public function update(Request $request, Item $item)
    {
        $this->authorizeAccess($request, $item);
        $user = $request->user();

        $data = $request->validate([
            'code' => ['sometimes','required','string','max:100', Rule::unique('items')->where('user_id', $user->id)->ignore($item->id)],
            'name' => ['sometimes','required','string','max:255'],
            'description' => ['nullable','string'],
            'price' => ['nullable','numeric','min:0','max:99999999.99'],
            'notes' => ['nullable','string'],
        ]);

        // Convert empty strings to null for nullable fields
        foreach (['description', 'price', 'notes'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        $item->update($data);
        return $item;
    }

    public function destroy(Request $request, Item $item)
    {
        $this->authorizeAccess($request, $item);
        $item->delete();
        return response()->json(['status' => 'deleted']);
    }

    private function authorizeAccess(Request $request, Item $item): void
    {
        abort_if($item->user_id !== $request->user()->id, 403);
    }
}
