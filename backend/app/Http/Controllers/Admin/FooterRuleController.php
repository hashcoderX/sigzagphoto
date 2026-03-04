<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FooterRule;
use Illuminate\Http\Request;

class FooterRuleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = FooterRule::where('user_id', $user->id)
            ->orderBy('order')
            ->orderByDesc('updated_at');

        return $query->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'order' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['user_id'] = $user->id;

        // If no order specified, set it to the next available order
        if (!isset($data['order'])) {
            $maxOrder = FooterRule::where('user_id', $user->id)->max('order') ?? 0;
            $data['order'] = $maxOrder + 1;
        }

        $footerRule = FooterRule::create($data);

        return response()->json($footerRule, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $footerRule = FooterRule::where('user_id', $user->id)->findOrFail($id);

        return response()->json($footerRule);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $footerRule = FooterRule::where('user_id', $user->id)->findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'string'],
            'order' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $footerRule->update($data);

        return response()->json($footerRule);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $footerRule = FooterRule::where('user_id', $user->id)->findOrFail($id);

        $footerRule->delete();

        return response()->json(['message' => 'Footer rule deleted successfully']);
    }
}
