<?php

namespace App\Http\Controllers;

use App\Models\ForumPost;
use App\Models\ForumThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForumThreadController extends Controller
{
    /**
     * GET /api/forum/threads
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int)$request->query('per_page', 10), 50));
        $q = trim((string) $request->query('q', ''));
        $category = trim((string) $request->query('category', ''));
        $tag = trim((string) $request->query('tag', ''));

        $query = ForumThread::with(['user:id,name']);
        if ($q !== '') {
            $query->where(function($sub) use ($q) {
                $sub->where('title', 'like', "%$q%")
                    ->orWhere('body', 'like', "%$q%");
            });
        }
        if ($category !== '') {
            $query->where('category', $category);
        }
        if ($tag !== '') {
            // tags stored as comma-separated list
            $query->where('tags', 'like', "%$tag%");
        }

        $threads = $query
            ->orderByDesc('last_post_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($threads);
    }

    /**
     * POST /api/forum/threads (auth)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required','string','max:200'],
            'category' => ['nullable','string','max:100'],
            'tags' => ['nullable','string','max:500'],
            'body' => ['required','string'],
        ]);

        $user = $request->user();
        $thread = ForumThread::create([
            'title' => $validated['title'],
            'category' => $validated['category'] ?? null,
            'tags' => $validated['tags'] ?? null,
            'body' => $validated['body'],
            'user_id' => $user->id,
            'replies_count' => 0,
            'last_post_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $thread->load('user:id,name'),
        ], 201);
    }

    /**
     * GET /api/forum/threads/{thread}
     */
    public function show(ForumThread $thread): JsonResponse
    {
        $thread->load(['user:id,name']);
        $posts = ForumPost::with(['user:id,name'])
            ->where('thread_id', $thread->id)
            ->orderBy('created_at')
            ->paginate(50);

        return response()->json([
            'thread' => $thread,
            'posts' => $posts,
        ]);
    }

    /**
     * PATCH /api/forum/threads/{thread} (auth)
     */
    public function update(Request $request, ForumThread $thread): JsonResponse
    {
        $user = $request->user();
        if ($user->id !== $thread->user_id && ($user->privilege ?? null) !== 'super') {
            return response()->json(['status' => 'error', 'message' => 'Forbidden'], 403);
        }
        $validated = $request->validate([
            'title' => ['sometimes','string','max:200'],
            'category' => ['sometimes','nullable','string','max:100'],
            'tags' => ['sometimes','nullable','string','max:500'],
            'body' => ['sometimes','string'],
        ]);
        $thread->fill($validated);
        $thread->save();
        return response()->json(['status' => 'success', 'data' => $thread->load('user:id,name')]);
    }

    /**
     * DELETE /api/forum/threads/{thread} (auth)
     */
    public function destroy(Request $request, ForumThread $thread): JsonResponse
    {
        $user = $request->user();
        if ($user->id !== $thread->user_id && ($user->privilege ?? null) !== 'super') {
            return response()->json(['status' => 'error', 'message' => 'Forbidden'], 403);
        }
        $thread->delete();
        return response()->json(['status' => 'success']);
    }
}
