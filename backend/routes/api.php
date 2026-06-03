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
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\GeocodingController;
use App\Http\Controllers\Api\SalonController;
use App\Http\Controllers\Api\AvailableHairdressersController;
use App\Http\Controllers\Api\PreferenceController;
use App\Http\Controllers\Api\SavedPostController;
use App\Http\Controllers\Api\UserController;

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public
Route::get('/feed', [HairdresserController::class, 'feed']);
Route::get('/hairdressers', [HairdresserController::class, 'index']);
Route::get('/hairdressers/{slug}', [HairdresserController::class, 'show']);
Route::get('/hairdressers/{slug}/posts', [HairdresserController::class, 'posts']);
Route::get('/hairdressers/{slug}/services', [ServiceController::class, 'publicList']);
Route::get('/hairdressers/{slug}/availability', [AvailabilityController::class, 'slots']);
Route::get('/hairdressers/{slug}/available-dates', [AvailabilityController::class, 'availableDates']);
Route::get('/specialties', [SpecialtyController::class, 'index']);
Route::get('/geocode', [GeocodingController::class, 'geocode']);
Route::get('/search', [SearchController::class, 'search']);
Route::get('/search/suggestions', [SearchController::class, 'suggestions']);
Route::get('/posts/{postId}', [PostController::class, 'show']);
Route::post('/appointments', [AppointmentController::class, 'store']);
Route::post('/review-by-token/{token}', [AppointmentController::class, 'reviewByToken']);

// Salons publics
Route::get('/salons', [SalonController::class, 'index']);
Route::get('/salons/{slug}', [SalonController::class, 'show']);

// Coiffeurs disponibles
Route::get('/available-hairdressers', [AvailableHairdressersController::class, 'index']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/preferences', [PreferenceController::class, 'store']);

    // Profil coiffeur (édition)
    Route::get('/profile',               [ProfileController::class, 'show']);
    Route::put('/profile',               [ProfileController::class, 'update']);
    Route::post('/profile/avatar',       [ProfileController::class, 'uploadAvatar']);
    Route::post('/profile/banner',       [ProfileController::class, 'uploadBanner']);

    // Profil utilisateur (tous rôles)
    Route::put('/user/profile',          [UserController::class, 'updateProfile']);
    Route::post('/user/avatar',          [UserController::class, 'uploadAvatar']);

    // Géolocalisation utilisateur
    Route::put('/user/location',         [ProfileController::class, 'updateLocation']);

    // Réalisations (posts)
    Route::get('/posts',                    [PostController::class, 'index']);
    Route::post('/posts',                   [PostController::class, 'store']);
    Route::put('/posts/{postId}',           [PostController::class, 'update']);
    Route::delete('/posts/{postId}',        [PostController::class, 'destroy']);
    Route::post('/posts/{postId}/like',     [PostController::class, 'toggleLike']);

    // Inspirations (saved posts)
    Route::get('/saved-posts',                  [SavedPostController::class, 'index']);
    Route::post('/saved-posts/{postId}',        [SavedPostController::class, 'save']);
    Route::delete('/saved-posts/{postId}',      [SavedPostController::class, 'unsave']);
    Route::get('/saved-posts/{postId}/status',  [SavedPostController::class, 'status']);

    // Saved profiles
    Route::get('/saved-profiles',                           [InteractionController::class, 'savedIndex']);
    Route::get('/followed-hairdressers',                    [InteractionController::class, 'followedIndex']);
    Route::post('/saved-profiles/{hairdresserId}',          [InteractionController::class, 'save']);
    Route::delete('/saved-profiles/{hairdresserId}',        [InteractionController::class, 'unsave']);

    // Follows
    Route::post('/follows/{hairdresserId}',   [InteractionController::class, 'follow']);
    Route::delete('/follows/{hairdresserId}', [InteractionController::class, 'unfollow']);

    // Status combiné (suivre + sauvegarder) pour un profil
    Route::get('/interactions/{hairdresserId}', [InteractionController::class, 'interactionStatus']);

    // Rendez-vous (coiffeur)
    Route::get('/appointments',               [AppointmentController::class, 'index']);
    Route::put('/appointments/{id}/status',   [AppointmentController::class, 'updateStatus']);
    Route::get('/stats',                      [AppointmentController::class, 'stats']);

    // Rendez-vous (client)
    Route::get('/my-appointments',                      [AppointmentController::class, 'clientAppointments']);
    Route::post('/appointments/{id}/review',            [AppointmentController::class, 'submitReview']);

    // Notifications
    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::post('/notifications/read-all',   [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',  [NotificationController::class, 'markRead']);

    // Catégories de services
    Route::get('/service-categories',          [ServiceController::class, 'indexCategories']);
    Route::post('/service-categories',         [ServiceController::class, 'storeCategory']);
    Route::put('/service-categories/{id}',     [ServiceController::class, 'updateCategory']);
    Route::delete('/service-categories/{id}',  [ServiceController::class, 'destroyCategory']);

    // Services
    Route::get('/services',          [ServiceController::class, 'indexServices']);
    Route::post('/services',         [ServiceController::class, 'storeService']);
    Route::put('/services/{id}',     [ServiceController::class, 'updateService']);
    Route::delete('/services/{id}',  [ServiceController::class, 'destroyService']);

    // Planning (horaires)
    Route::get('/schedule',    [ScheduleController::class, 'index']);
    Route::put('/schedule',    [ScheduleController::class, 'update']);

    // Indisponibilités
    Route::get('/unavailabilities',           [ScheduleController::class, 'indexUnavailabilities']);
    Route::post('/unavailabilities',          [ScheduleController::class, 'storeUnavailability']);
    Route::delete('/unavailabilities/{id}',   [ScheduleController::class, 'destroyUnavailability']);

    // Salons (gestion)
    Route::get('/my-salon',                            [SalonController::class, 'mySalon']);
    Route::put('/my-salon',                            [SalonController::class, 'updateMySalon']);
    Route::post('/my-salon/logo',                      [SalonController::class, 'uploadLogo']);
    Route::post('/my-salon/cover',                     [SalonController::class, 'uploadCover']);

    // Demandes de rejoindre un salon
    Route::post('/join-salon',                         [SalonController::class, 'requestJoin']);
    Route::get('/my-join-requests',                    [SalonController::class, 'myJoinRequests']);
    Route::post('/join-requests/{id}/accept',          [SalonController::class, 'acceptJoinRequest']);
    Route::post('/join-requests/{id}/decline',         [SalonController::class, 'declineJoinRequest']);
    Route::delete('/leave-salon',                      [SalonController::class, 'leaveSalon']);
});
