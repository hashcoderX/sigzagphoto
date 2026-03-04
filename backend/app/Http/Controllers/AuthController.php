<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rules\Password;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        Log::info('Register attempt payload', [
            'payload' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'accept' => $request->header('Accept'),
        ]);

        // Normalize auto_renew incoming checkbox values like "on"/"off" to boolean prior to validation
        if ($request->has('auto_renew')) {
            $raw = $request->input('auto_renew');
            if (is_string($raw)) {
                $lower = strtolower($raw);
                if ($lower === 'on') { $request->merge(['auto_renew' => true]); }
                elseif ($lower === 'off') { $request->merge(['auto_renew' => false]); }
            }
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', 'string', 'in:photographer,business,buyer'],
            // Contact fields
            'phone' => ['nullable','string','max:30'],
            'whatsapp' => ['nullable','string','max:30'],
            'website' => ['nullable','string','max:255'],
            // Optional profile/subscription fields
            'country' => ['nullable','string','max:100'],
            'address' => ['nullable','string'],
            'currency' => ['nullable','string','size:3'],
            // Branding assets
            'logo' => ['nullable','image','max:2048'],
            'cover' => ['nullable','image','max:4096'],
        ]);

        // password is automatically hashed by User model casts
        $now = Carbon::now();
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'whatsapp' => $validated['whatsapp'] ?? null,
            'website' => $validated['website'] ?? null,
            'country' => $validated['country'] ?? null,
            'address' => $validated['address'] ?? null,
            'currency' => $validated['currency'] ?? null,
            'payment_provider' => null,
            'payment_customer_id' => null,
            // Free trial window (30 days) - stored but not enforced by middleware
            'trial_started_at' => $now,
            'trial_ends_at' => $now->copy()->addDays(30),
        ]);

        // Trial feature disabled: do not set trial or next payment fields

        // Handle uploads if provided
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $user->logo_path = $path;
        }
        if ($request->hasFile('cover')) {
            $path = $request->file('cover')->store('covers', 'public');
            $user->cover_path = $path;
        }
        if ($user->isDirty()) { $user->save(); }

    $token = $user->createToken('api')->plainTextToken;
    Log::info('Register success', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'whatsapp' => $user->whatsapp,
                'website' => $user->website,
                'country' => $user->country,
                'address' => $user->address,
                'currency' => $user->currency,
                'logo_url' => $user->logo_path ? asset('storage/'.$user->logo_path) : null,
                'cover_url' => $user->cover_path ? asset('storage/'.$user->cover_path) : null,
                'trial_started_at' => optional($user->trial_started_at)?->toIso8601String(),
                'trial_ends_at' => optional($user->trial_ends_at)?->toIso8601String(),
                'premium_package' => (bool)$user->premium_package,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        Log::info('Login attempt payload', [
            'payload' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'accept' => $request->header('Accept'),
        ]);
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::where('email', $validated['email'])->first();
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials',
            ], 422);
        }

        // Trial feature disabled – do not set or calculate trial fields on login

        $token = $user->createToken('api')->plainTextToken;
        Log::info('Login success', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'privilege' => $user->privilege,
                'trial_started_at' => optional($user->trial_started_at)?->toIso8601String(),
                'trial_ends_at' => optional($user->trial_ends_at)?->toIso8601String(),
                'premium_package' => (bool)$user->premium_package,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'privilege' => $user->privilege,
            'phone' => $user->phone,
            'whatsapp' => $user->whatsapp,
            'website' => $user->website,
            'country' => $user->country,
            'address' => $user->address,
            'currency' => $user->currency,
            'logo_url' => $user->logo_path ? asset('storage/'.$user->logo_path) : null,
            'cover_url' => $user->cover_path ? asset('storage/'.$user->cover_path) : null,
            'trial_started_at' => optional($user->trial_started_at)?->toIso8601String(),
            'trial_ends_at' => optional($user->trial_ends_at)?->toIso8601String(),
            'premium_package' => (bool)$user->premium_package,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['status' => 'success']);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'email' => ['sometimes','string','email','max:255', \Illuminate\Validation\Rule::unique('users','email')->ignore($user->id)],
            'password' => ['sometimes','string', \Illuminate\Validation\Rules\Password::min(8)],
            'name' => ['sometimes','string','max:255'],
            'phone' => ['sometimes','nullable','string','max:30'],
            'whatsapp' => ['sometimes','nullable','string','max:30'],
            'website' => ['sometimes','nullable','string','max:255'],
            'country' => ['sometimes','nullable','string','max:100'],
            'address' => ['sometimes','nullable','string'],
            'currency' => ['sometimes','nullable','string','size:3'],
            'logo' => ['sometimes','nullable','image','max:2048'],
            'cover' => ['sometimes','nullable','image','max:4096'],
        ]);

        foreach (['email','name','phone','whatsapp','website','country','address','currency'] as $field) {
            if (array_key_exists($field, $validated)) {
                $user->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('password', $validated)) {
            $user->password = $validated['password'];
        }

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $user->logo_path = $path;
        }
        if ($request->hasFile('cover')) {
            $path = $request->file('cover')->store('covers', 'public');
            $user->cover_path = $path;
        }

        $user->save();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'privilege' => $user->privilege,
            'phone' => $user->phone,
            'whatsapp' => $user->whatsapp,
            'website' => $user->website,
            'country' => $user->country,
            'address' => $user->address,
            'currency' => $user->currency,
            'logo_url' => $user->logo_path ? asset('storage/'.$user->logo_path) : null,
            'cover_url' => $user->cover_path ? asset('storage/'.$user->cover_path) : null,
            'premium_package' => (bool)$user->premium_package,
        ]);
    }

    /**
     * Sign up / sign in using a Google ID token provided by the frontend
     */
    public function loginWithGoogle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_token' => ['required','string'],
            'role' => ['nullable','string','in:photographer,business,buyer'],
        ]);

        $idToken = $validated['id_token'];
        $expectedAud = env('GOOGLE_CLIENT_ID');
        if (!$expectedAud) {
            return response()->json(['status' => 'error', 'message' => 'Google OAuth not configured'], 500);
        }

        try {
            // Validate ID token via Google tokeninfo endpoint
            $resp = Http::acceptJson()->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $idToken]);
            if (!$resp->ok()) {
                return response()->json(['status' => 'error', 'message' => 'Invalid Google token'], 422);
            }
            $data = $resp->json();
            $aud = $data['aud'] ?? null;
            $email = $data['email'] ?? null;
            $emailVerified = filter_var($data['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
            $name = $data['name'] ?? ($data['given_name'] ?? 'Google User');

            if ($aud !== $expectedAud || !$email) {
                return response()->json(['status' => 'error', 'message' => 'Token audience mismatch or missing email'], 422);
            }
            if (!$emailVerified) {
                return response()->json(['status' => 'error', 'message' => 'Google email not verified'], 422);
            }

            // Find or create user by email
            /** @var User|null $user */
            $user = User::where('email', $email)->first();
            if (!$user) {
                $role = $validated['role'] ?? 'buyer';
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    // random password, never used; hashed by casts
                    'password' => bin2hex(random_bytes(16)),
                    'role' => $role,
                    'email_verified_at' => now(),
                ]);
            }

            $token = $user->createToken('api')->plainTextToken;
            return response()->json([
                'status' => 'success',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'premium_package' => (bool) $user->premium_package,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Google OAuth error', ['message' => $e->getMessage()]);
            return response()->json(['status' => 'error', 'message' => 'Google sign-in failed'], 500);
        }
    }

    /**
     * Sign up / sign in using a Facebook access token provided by the frontend
     */
    public function loginWithFacebook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'access_token' => ['required','string'],
            'role' => ['nullable','string','in:photographer,business,buyer'],
        ]);

        $accessToken = $validated['access_token'];
        $appId = env('FACEBOOK_APP_ID');
        $appSecret = env('FACEBOOK_APP_SECRET');
        if (!$appId || !$appSecret) {
            return response()->json(['status' => 'error', 'message' => 'Facebook OAuth not configured'], 500);
        }

        try {
            // Verify token via Facebook debug_token
            $appAccessToken = $appId.'|'.$appSecret;
            $debugResp = Http::asForm()->get('https://graph.facebook.com/debug_token', [
                'input_token' => $accessToken,
                'access_token' => $appAccessToken,
            ]);
            if (!$debugResp->ok()) {
                return response()->json(['status' => 'error', 'message' => 'Invalid Facebook token'], 422);
            }
            $debug = $debugResp->json('data') ?? [];
            $isValid = (bool)($debug['is_valid'] ?? false);
            $appIdFromToken = $debug['app_id'] ?? null;
            $userId = $debug['user_id'] ?? null;
            if (!$isValid || $appIdFromToken !== $appId || !$userId) {
                return response()->json(['status' => 'error', 'message' => 'Token validation failed'], 422);
            }

            // Fetch user profile to get email and name
            $profileResp = Http::get('https://graph.facebook.com/v17.0/me', [
                'fields' => 'id,name,email',
                'access_token' => $accessToken,
            ]);
            if (!$profileResp->ok()) {
                return response()->json(['status' => 'error', 'message' => 'Unable to fetch Facebook profile'], 422);
            }
            $profile = $profileResp->json();
            $email = $profile['email'] ?? null;
            $name = $profile['name'] ?? 'Facebook User';

            if (!$email) {
                return response()->json(['status' => 'error', 'message' => 'Facebook account has no email'], 422);
            }

            /** @var User|null $user */
            $user = User::where('email', $email)->first();
            if (!$user) {
                $role = $validated['role'] ?? 'buyer';
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => bin2hex(random_bytes(16)),
                    'role' => $role,
                    'email_verified_at' => now(),
                ]);
            }

            $token = $user->createToken('api')->plainTextToken;
            return response()->json([
                'status' => 'success',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'premium_package' => (bool) $user->premium_package,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Facebook OAuth error', ['message' => $e->getMessage()]);
            return response()->json(['status' => 'error', 'message' => 'Facebook sign-in failed'], 500);
        }
    }
}
