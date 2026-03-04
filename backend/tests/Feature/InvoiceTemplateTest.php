<?php

namespace Tests\Feature;

use App\Models\InvoiceTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvoiceTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_invoice_template(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $templateData = [
            'name' => 'Test Template',
            'description' => 'A test invoice template',
            'elements' => [
                [
                    'id' => 'text-1',
                    'type' => 'text',
                    'content' => 'Invoice Title',
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

        $response = $this->postJson('/api/admin/invoice-templates', $templateData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'user_id',
                'name',
                'description',
                'elements',
                'page_width',
                'page_height',
                'background_color',
                'created_at',
                'updated_at'
            ]);

        $this->assertDatabaseHas('invoice_templates', [
            'user_id' => $user->id,
            'name' => 'Test Template',
        ]);
    }

    public function test_user_can_list_their_invoice_templates(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($user);

        InvoiceTemplate::factory()->create(['user_id' => $user->id]);
        InvoiceTemplate::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->getJson('/api/admin/invoice-templates');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_user_cannot_access_other_users_templates(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($user);

        $template = InvoiceTemplate::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->getJson("/api/admin/invoice-templates/{$template->id}");

        $response->assertStatus(403);
    }
}