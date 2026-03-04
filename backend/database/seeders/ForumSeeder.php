<?php

namespace Database\Seeders;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Seeder;

class ForumSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure we have some users to own threads and posts
        if (User::count() < 3) {
            User::factory()->count(3)->create();
        }

        // Create 10 sample threads
        $threads = ForumThread::factory()->count(10)->create();

        // For each thread, add 0-3 sample replies and update counters
        foreach ($threads as $thread) {
            $count = random_int(0, 3);
            if ($count > 0) {
                ForumPost::factory()->count($count)->create(['thread_id' => $thread->id]);
                $thread->replies_count = $count;
                $thread->last_post_at = now();
                $thread->save();
            }
        }
    }
}
