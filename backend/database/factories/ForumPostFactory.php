<?php

namespace Database\Factories;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumPost>
 */
class ForumPostFactory extends Factory
{
    protected $model = ForumPost::class;

    public function definition(): array
    {
        $threadId = ForumThread::inRandomOrder()->value('id') ?? ForumThread::factory()->create()->id;
        $userId = User::inRandomOrder()->value('id') ?? User::factory()->create()->id;

        return [
            'thread_id' => $threadId,
            'user_id' => $userId,
            'body' => $this->faker->paragraphs(2, true),
        ];
    }
}
