<?php

use Illuminate\Http\Request;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ThreadController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/threads', [ThreadController::class, 'index']);
    Route::post('/threads', [ThreadController::class, 'store']);
    Route::get('/threads/{id}', [ThreadController::class, 'show']);
    Route::post('/threads/{id}/messages', [ThreadController::class, 'storeMessage']);
});