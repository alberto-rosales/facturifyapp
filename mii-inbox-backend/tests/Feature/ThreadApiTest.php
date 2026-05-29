<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ThreadApiTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function un_usuario_no_autenticado_recibe_error_al_intentar_ver_hilos()
    {
        $response = $this->getJson('/api/threads');
        $response->assertStatus(401);
    }

    /** @test */
    public function un_usuario_autenticado_puede_listar_los_hilos()
    {
        
        $user = User::factory()->create();
        $response = $this->actingAs($user, 'api')->getJson('/api/threads');
        $response->assertStatus(200);
    }
}