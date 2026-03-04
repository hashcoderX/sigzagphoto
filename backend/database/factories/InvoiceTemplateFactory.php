<?php

namespace Database\Factories;

use App\Models\InvoiceTemplate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InvoiceTemplate>
 */
class InvoiceTemplateFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = InvoiceTemplate::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->paragraph(),
            'elements' => [
                [
                    'id' => 'text-1',
                    'type' => 'text',
                    'content' => 'Sample Invoice',
                    'x' => 100,
                    'y' => 50,
                    'width' => 200,
                    'height' => 30,
                    'fontSize' => 24,
                    'color' => '#000000',
                ]
            ],
            'page_width' => 595,
            'page_height' => 842,
            'background_color' => '#ffffff',
            'paper_size' => 'A4',
            'margins' => [
                'top' => 20,
                'right' => 20,
                'bottom' => 20,
                'left' => 20
            ],
        ];
    }
}