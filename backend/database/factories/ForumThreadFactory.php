<?php

namespace Database\Factories;

use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumThread>
 */
class ForumThreadFactory extends Factory
{
    protected $model = ForumThread::class;

    public function definition(): array
    {
        $categories = ['Gear', 'Editing', 'Business', 'Shooting', 'Post Processing'];
        $tagsSets = [
            'canon,portrait',
            'nikon,landscape',
            'sony,mirrorless',
            'lightroom,workflow',
            'photoshop,retouch',
            'pricing,clients',
        ];

        $userId = User::inRandomOrder()->value('id') ?? User::factory()->create()->id;

        return [
            'title' => $this->faker->sentence(6),
            'category' => $this->faker->randomElement($categories),
            'tags' => $this->faker->randomElement($tagsSets),
            'body' => $this->faker->paragraphs(3, true),
            'user_id' => $userId,
            'replies_count' => 0,
            'last_post_at' => now(),
        ];
    }
}
