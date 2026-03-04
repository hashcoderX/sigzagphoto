<?php

namespace App\Http\Controllers;

use App\Models\ForumPost;
use App\Models\ForumThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForumPostController extends Controller
{
    /**
     * POST /api/forum/threads/{thread}/posts (auth)
     */
    public function store(Request $request, ForumThread $thread): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['required','string'],
        ]);

        $user = $request->user();
        $post = ForumPost::create([
            'thread_id' => $thread->id,
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        // Update thread counters
        $thread->replies_count = ($thread->replies_count ?? 0) + 1;
        $thread->last_post_at = now();
        $thread->save();

        return response()->json([
            'status' => 'success',
            'data' => $post->load('user:id,name'),
        ], 201);
    }

    /**
     * PATCH /api/forum/posts/{post} (auth)
     */
    public function update(Request $request, ForumPost $post): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }
        if ($user->id !== $post->user_id && ($user->privilege ?? null) !== 'super') {
            return response()->json(['status' => 'error', 'message' => 'Forbidden'], 403);
        }
        $validated = $request->validate([
            'body' => ['required','string'],
        ]);
        $post->body = $validated['body'];
        $post->save();
        return response()->json(['status' => 'success', 'data' => $post->load('user:id,name')]);
    }

    /**
     * DELETE /api/forum/posts/{post} (auth)
     */
    public function destroy(Request $request, ForumPost $post): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }
        if ($user->id !== $post->user_id && ($user->privilege ?? null) !== 'super') {
            return response()->json(['status' => 'error', 'message' => 'Forbidden'], 403);
        }
        $thread = ForumThread::find($post->thread_id);
        $post->delete();
        if ($thread) {
            $thread->replies_count = max(0, ($thread->replies_count ?? 1) - 1);
            $thread->save();
        }
        return response()->json(['status' => 'success']);
    }
}
