<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php', // Tus rutas de API generadas
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        
        // Habilitar y configurar CORS de manera global para tu API
        $middleware->statefulApi(); // Optimiza el manejo de estado para SPAs
        
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();