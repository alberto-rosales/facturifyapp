<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Thread;
use Illuminate\Support\Facades\Hash;

class UserAndThreadSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear el usuario administrador con las credenciales por defecto del Front
        $admin = User::create([
            'name' => 'Yo (Soporte)',
            'email' => 'admin@facturify.com',
            'password' => Hash::make('password123'), 
        ]);

        // 2. Crear un usuario cliente ficticio para simular la otra parte del chat
        $cliente = User::create([
            'name' => 'Alice',
            'email' => 'alice@test.com',
            'password' => Hash::make('secret'),
        ]);

        // 3. Crear el hilo inicial
        $thread = Thread::create([
            'subject' => 'Soporte Técnico - Alice',
            'user_id' => $cliente->id,
        ]);

        // Primer mensaje de Alice ejemplo
        $thread->messages()->create([
            'user_id' => $cliente->id,
            'body' => 'Hola, tengo dudas sobre el procesamiento de mi última factura mensual.',
        ]);
    }
}