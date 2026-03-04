<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required','email','max:255'],
        ]);

        $sub = Subscription::firstOrCreate(['email' => strtolower($validated['email'])]);

        return response()->json([
            'status' => 'success',
            'message' => 'Subscribed successfully',
            'data' => [
                'id' => $sub->id,
                'email' => $sub->email,
                'created_at' => optional($sub->created_at)?->toIso8601String(),
            ],
        ], 201);
    }
}
