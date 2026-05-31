<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HairdresserController;
use App\Http\Controllers\Api\SpecialtyController;
use App\Http\Controllers\Api\InteractionController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\AppointmentController;

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public
Route::get('/feed', [HairdresserController::class, 'feed']);
Route::get('/hairdressers', [HairdresserController::class, 'index']);
Route::get('/hairdressers/{slug}', [HairdresserController::class, 'show']);
Route::get('/hairdressers/{slug}/posts', [HairdresserController::class, 'posts']);
Route::get('/specialties', [SpecialtyController::class, 'index']);
Route::get('/posts/{postId}', [PostController::class, 'show']);
Route::post('/appointments', [AppointmentController::class, 'store']);
Route::post('/review-by-token/{token}', [AppointmentController::class, 'reviewByToken']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Profil coiffeur (édition)
    Route::get('/profile',               [ProfileController::class, 'show']);
    Route::put('/profile',               [ProfileController::class, 'update']);
    Route::post('/profile/avatar',       [ProfileController::class, 'uploadAvatar']);
    Route::post('/profile/banner',       [ProfileController::class, 'uploadBanner']);

    // Réalisations (posts)
    Route::get('/posts',          [PostController::class, 'index']);
    Route::post('/posts',         [PostController::class, 'store']);
    Route::put('/posts/{postId}', [PostController::class, 'update']);
    Route::delete('/posts/{postId}', [PostController::class, 'destroy']);

    // Saved profiles
    Route::get('/saved-profiles', [InteractionController::class, 'savedIndex']);
    Route::post('/saved-profiles/{hairdresserId}', [InteractionController::class, 'save']);
    Route::delete('/saved-profiles/{hairdresserId}', [InteractionController::class, 'unsave']);

    // Follows
    Route::post('/follows/{hairdresserId}', [InteractionController::class, 'follow']);
    Route::delete('/follows/{hairdresserId}', [InteractionController::class, 'unfollow']);

    // Status combiné (suivre + sauvegarder) pour un profil
    Route::get('/interactions/{hairdresserId}', [InteractionController::class, 'interactionStatus']);

    // Rendez-vous (coiffeur)
    Route::get('/appointments',                      [AppointmentController::class, 'index']);
    Route::put('/appointments/{id}/status',          [AppointmentController::class, 'updateStatus']);
    Route::get('/stats',                             [AppointmentController::class, 'stats']);
});
