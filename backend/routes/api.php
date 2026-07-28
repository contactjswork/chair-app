<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
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
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\JobOfferController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\StreakController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ChairRentalController;
use App\Http\Controllers\Api\JobApplicationController;
use App\Http\Controllers\Api\SalonInvitationController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\SpecialtyProgressController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\SupportController;

// Admin (token statique via Bearer, ADMIN_API_TOKEN — jamais de secret par défaut)
Route::prefix('admin')->middleware('admin.token')->group(function () {
    Route::get('/stats',                        [AdminController::class, 'stats']);
    Route::get('/top-hairdressers',             [AdminController::class, 'topHairdressers']);
    Route::get('/activity',                     [AdminController::class, 'recentActivity']);
    Route::get('/users',                        [AdminController::class, 'users']);
    Route::get('/users/{id}',                   [AdminController::class, 'showUser']);
    Route::post('/users/{id}/suspend',          [AdminController::class, 'suspendUser']);
    Route::post('/users/{id}/unsuspend',        [AdminController::class, 'unsuspendUser']);
    Route::delete('/users/{id}',                [AdminController::class, 'deleteUser']);
    Route::get('/hairdressers',                 [AdminController::class, 'hairdressers']);
    Route::get('/appointments',                 [AdminController::class, 'appointments']);
    Route::get('/reviews',                      [AdminController::class, 'reviews']);
    Route::post('/reviews/{id}/hide',           [AdminController::class, 'hideReview']);
    Route::post('/reviews/{id}/show',           [AdminController::class, 'showReview']);
    Route::delete('/reviews/{id}',              [AdminController::class, 'deleteReview']);
    Route::get('/reports',                      [AdminController::class, 'reports']);
    Route::post('/reports/{id}/ignore',         [AdminController::class, 'ignoreReport']);
    Route::get('/subscriptions',                [AdminController::class, 'subscriptions']);
    Route::get('/diplomas/pending',             [AdminController::class, 'pendingDiplomas']);
    Route::post('/diplomas/{id}/approve',       [AdminController::class, 'approveDiploma']);
    Route::post('/diplomas/{id}/reject',        [AdminController::class, 'rejectDiploma']);
    Route::get('/analytics',                    [AdminController::class, 'analyticsStats']);
    Route::post('/notifications/send',          [AdminController::class, 'sendNotification']);
    Route::get('/notifications/history',        [AdminController::class, 'notificationHistory']);
    Route::post('/hairdressers/{id}/chair-pick',   [AdminController::class, 'setChairPick']);
    Route::delete('/hairdressers/{id}/chair-pick', [AdminController::class, 'removeChairPick']);
    Route::get('/support-requests',                [AdminController::class, 'supportRequests']);
    Route::post('/support-requests/{id}/resolve',  [AdminController::class, 'resolveSupportRequest']);
});

// Auth — throttle dédié : le seul throttle:api global (60/min) laisse trop de
// marge pour du brute-force login/mot de passe (voir audit pré-lancement).
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:4,1');
Route::post('/contact', [ContactController::class, 'store'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');

// Scan QR — info publique (affichage avant connexion)
Route::get('/scan/{token}', [VisitController::class, 'getTokenInfo']);

// Stripe webhook — PUBLIC par nécessité (Stripe n'a pas de token Sanctum),
// sécurisé uniquement par la vérification de signature (voir StripeWebhookController).
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

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
Route::get('/geo/regions', [GeoController::class, 'regions']);
Route::get('/geo/departments', [GeoController::class, 'departments']);
Route::get('/search', [SearchController::class, 'search']);
Route::get('/search/suggestions', [SearchController::class, 'suggestions']);
Route::get('/explore', [App\Http\Controllers\Api\ExploreController::class, 'index']);
Route::get('/posts/{postId}', [PostController::class, 'show']);
Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('throttle:15,1');
Route::post('/review-by-token/{token}', [AppointmentController::class, 'reviewByToken'])->middleware('throttle:10,1');
Route::get('/leaderboard', [LeaderboardController::class, 'index']);
Route::get('/invitations/{token}', [SalonInvitationController::class, 'showByToken']);

// Salons publics
Route::get('/salons', [SalonController::class, 'index']);
Route::get('/salons/{slug}', [SalonController::class, 'show']);
Route::get('/verify-siret', [SalonController::class, 'verifySiret'])->middleware('throttle:10,1');
Route::get('/job-offers', [JobOfferController::class, 'index']);
Route::get('/training-badges', [TrainingController::class, 'catalogue']);

// Coiffeurs disponibles
Route::get('/available-hairdressers', [AvailableHairdressersController::class, 'index']);

// Fauteuils publics — consultable sans compte (seule l'envoi d'une demande exige d'être connecté + SIRET vérifié)
Route::get('/chair-rentals', [ChairRentalController::class, 'publicList']);
Route::get('/chair-rentals/slug/{slug}', [ChairRentalController::class, 'show']);

// Protected
Route::middleware(['auth:sanctum', 'not.suspended'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::delete('/account', [AuthController::class, 'deleteAccount']);
    Route::post('/preferences', [PreferenceController::class, 'store']);

    // Double identité gérant/coiffeur
    Route::post('/my-account/enable-hairdresser-mode', [AuthController::class, 'enableHairdresserMode']);
    Route::post('/my-account/enable-salon-owner-mode', [AuthController::class, 'enableSalonOwnerMode']);
    Route::post('/my-account/switch-pro-mode',         [AuthController::class, 'switchProMode']);

    // Profil coiffeur (édition)
    Route::get('/profile',               [ProfileController::class, 'show']);
    Route::put('/profile',               [ProfileController::class, 'update']);
    Route::post('/profile/avatar',       [ProfileController::class, 'uploadAvatar']);
    Route::post('/profile/banner',       [ProfileController::class, 'uploadBanner']);
    Route::post('/profile/diploma-document', [ProfileController::class, 'uploadDiplomaDocument']);
    Route::post('/profile/siret',        [ProfileController::class, 'submitSiret']);

    // Profil utilisateur (tous rôles)
    Route::put('/user/profile',          [UserController::class, 'updateProfile']);
    Route::put('/user/password',         [UserController::class, 'updatePassword']);
    Route::post('/user/avatar',          [UserController::class, 'uploadAvatar']);

    // Géolocalisation utilisateur
    Route::put('/user/location',         [ProfileController::class, 'updateLocation']);

    // Réalisations (posts) — /posts/reorder AVANT /posts/{postId} (sinon
    // Laravel matche "reorder" comme un {postId} littéral et route vers update()).
    Route::get('/posts',                    [PostController::class, 'index']);
    Route::post('/posts',                   [PostController::class, 'store']);
    Route::put('/posts/reorder',            [PostController::class, 'reorder']);
    Route::put('/posts/{postId}',           [PostController::class, 'update']);
    Route::delete('/posts/{postId}',        [PostController::class, 'destroy']);
    Route::post('/posts/{postId}/like',     [PostController::class, 'toggleLike']);
    Route::post('/posts/{postId}/pin',      [PostController::class, 'togglePin']);

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
    Route::put('/appointments/{id}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::get('/stats',                      [AppointmentController::class, 'stats']);

    // Rendez-vous (client)
    Route::get('/my-appointments',                      [AppointmentController::class, 'clientAppointments']);
    Route::post('/appointments/{id}/review',            [AppointmentController::class, 'submitReview']);

    // Réponses aux avis (coiffeur)
    Route::post('/reviews/{id}/reply',                  [ReviewController::class, 'reply']);

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

    // Fenêtre de réservation (jusqu'à combien de jours à l'avance les clients peuvent réserver)
    Route::get('/booking-window', [ScheduleController::class, 'getBookingWindow']);
    Route::put('/booking-window', [ScheduleController::class, 'updateBookingWindow']);

    // Scan QR — confirmation visite + avis (auth client requise)
    // /scan/review AVANT /scan/{token} pour éviter le conflit de route wildcard
    Route::post('/scan/review',          [VisitController::class, 'submitReview']);
    Route::post('/scan/{token}',         [VisitController::class, 'confirmVisit']);

    // QR Code coiffeur
    Route::get('/hairdresser/qr-token',          [VisitController::class, 'getQrToken']);
    Route::post('/hairdresser/qr-token/refresh', [VisitController::class, 'refreshQrToken']);
    Route::get('/hairdresser/visits',            [VisitController::class, 'myVisits']);

    // Offres de recrutement (salon_owner)
    Route::get('/my-job-offers',             [JobOfferController::class, 'mySalonOffers']);
    Route::post('/job-offers',               [JobOfferController::class, 'store']);
    Route::put('/job-offers/{id}',           [JobOfferController::class, 'update']);
    Route::delete('/job-offers/{id}',        [JobOfferController::class, 'destroy']);

    // Formations (coiffeur)
    Route::get('/my-training-badges',              [TrainingController::class, 'myBadges']);
    Route::post('/my-training-badges',             [TrainingController::class, 'add']);
    Route::delete('/my-training-badges/{badgeId}', [TrainingController::class, 'remove']);

    // Salons (gestion)
    Route::post('/my-salon',                               [SalonController::class, 'createMySalon']);
    Route::get('/my-salon',                                [SalonController::class, 'mySalon']);
    Route::get('/my-salon/recent-reviews',                 [SalonController::class, 'recentReviews']);
    Route::put('/my-salon',                                [SalonController::class, 'updateMySalon']);
    Route::post('/my-salon/logo',                          [SalonController::class, 'uploadLogo']);
    Route::post('/my-salon/cover',                         [SalonController::class, 'uploadCover']);
    Route::delete('/my-salon/hairdressers/{id}',           [SalonController::class, 'removeHairdresser']);
    Route::post('/my-salon/hairdressers/{id}/review-invite', [SalonController::class, 'inviteReview']);

    // Demandes de rejoindre un salon
    Route::post('/join-salon',                         [SalonController::class, 'requestJoin']);
    Route::get('/my-join-requests',                    [SalonController::class, 'myJoinRequests']);
    Route::post('/join-requests/{id}/accept',          [SalonController::class, 'acceptJoinRequest']);
    Route::post('/join-requests/{id}/decline',         [SalonController::class, 'declineJoinRequest']);
    Route::delete('/leave-salon',                      [SalonController::class, 'leaveSalon']);

    // Fauteuils (salon_owner)
    Route::get('/my-salon/rentals',                          [ChairRentalController::class, 'myRentals']);
    Route::post('/my-salon/rentals',                         [ChairRentalController::class, 'store']);
    Route::put('/my-salon/rentals/{id}',                     [ChairRentalController::class, 'update']);
    Route::delete('/my-salon/rentals/{id}',                  [ChairRentalController::class, 'destroy']);
    Route::post('/my-salon/rentals/{id}/photos',             [ChairRentalController::class, 'uploadPhoto']);
    Route::put('/my-salon/rentals/{id}/photos/order',        [ChairRentalController::class, 'reorderPhotos']);
    Route::delete('/my-salon/rentals/{id}/photos',           [ChairRentalController::class, 'deletePhoto']);
    Route::get('/my-salon/rental-requests',                  [ChairRentalController::class, 'myRequests']);
    Route::post('/my-salon/rental-requests/{id}/accept',     [ChairRentalController::class, 'acceptRequest']);
    Route::post('/my-salon/rental-requests/{id}/decline',    [ChairRentalController::class, 'declineRequest']);

    // Fauteuils — fil de discussion d'une demande (gérant ET coiffeur)
    Route::get('/chair-rental-requests/{id}',                [ChairRentalController::class, 'showRequest']);
    Route::post('/chair-rental-requests/{id}/messages',      [ChairRentalController::class, 'sendMessage']);

    // Invitations (salon_owner → coiffeur)
    Route::post('/my-salon/invite',                          [SalonInvitationController::class, 'invite']);
    Route::get('/my-salon/invitations',                      [SalonInvitationController::class, 'sentInvitations']);
    Route::post('/my-salon/invitations/{id}/resend',         [SalonInvitationController::class, 'resend']);
    Route::delete('/my-salon/invitations/{id}',              [SalonInvitationController::class, 'cancel']);

    // Invitations (coiffeur)
    Route::get('/my-invitations',                            [SalonInvitationController::class, 'myInvitations']);
    Route::post('/my-invitations/{id}/accept',               [SalonInvitationController::class, 'accept']);
    Route::post('/my-invitations/{id}/decline',              [SalonInvitationController::class, 'decline']);

    // Invitations par lien (email, avec ou sans compte existant au moment de l'envoi)
    Route::post('/invitations/{token}/accept',                [SalonInvitationController::class, 'acceptByToken']);
    Route::post('/invitations/{token}/decline',                [SalonInvitationController::class, 'declineByToken']);

    // Fauteuils (coiffeur indépendant) — listing/fiche publics déplacés hors de ce groupe (voir plus haut)
    Route::post('/chair-rentals/{id}/request',               [ChairRentalController::class, 'sendRequest']);
    Route::get('/my-chair-requests',                         [ChairRentalController::class, 'myRequests_hairdresser']);
    Route::post('/my-chair-requests/{id}/cancel',            [ChairRentalController::class, 'cancelRequest']);

    // Candidatures (salon_owner)
    Route::get('/my-salon/applications',                     [JobApplicationController::class, 'myApplications']);
    Route::get('/my-salon/applications/pending-count',       [JobApplicationController::class, 'pendingCount']);
    Route::put('/my-salon/applications/{id}',                [JobApplicationController::class, 'updateStatus']);

    // Candidatures (coiffeur)
    Route::post('/job-offers/{id}/apply',                    [JobApplicationController::class, 'apply']);
    Route::get('/my-applications',                           [JobApplicationController::class, 'myApplications_hairdresser']);

    // Streak
    Route::get('/my-streak', [StreakController::class, 'show']);

    // Rang privé (classement public déjà exposé sur GET /leaderboard)
    Route::get('/my-rank', [LeaderboardController::class, 'myRank']);
    Route::get('/my-specialty-rank', [LeaderboardController::class, 'mySpecialtyRank']);

    // Réputation par spécialité (voir docs/REPUTATION_ARCHITECTURE.md)
    Route::get('/my-specialty-progress', [SpecialtyProgressController::class, 'mine']);

    // Programme ambassadeur (voir docs/GROWTH.md)
    Route::get('/my-referral',  [ReferralController::class, 'mine']);
    Route::post('/share-events',[ReferralController::class, 'share']);

    // Abonnements CHAIR+ / CHAIR BUSINESS (voir docs/CHAIR_PLUS.md)
    Route::get('/my-subscription',    [SubscriptionController::class, 'mine']);
    Route::post('/subscribe',         [SubscriptionController::class, 'subscribe']);
    Route::post('/subscribe/manage',  [SubscriptionController::class, 'manage']);

    // Stories CHAIR+ (voir docs/CHAIR_PLUS.md)
    Route::get('/stories/feed',                    [StoryController::class, 'feed']);
    Route::get('/stories/mine',                     [StoryController::class, 'mine']);
    Route::get('/stories/by-hairdresser/{id}',      [StoryController::class, 'byHairdresser']);
    Route::post('/stories',                         [StoryController::class, 'store']);
    Route::post('/stories/{id}/view',                [StoryController::class, 'view']);
    Route::delete('/stories/{id}',                   [StoryController::class, 'destroy']);

    // Analytics
    Route::get('/my-analytics', [AnalyticsController::class, 'show']);
    Route::get('/my-analytics/timeseries', [AnalyticsController::class, 'timeseries']);

    // Support prioritaire CHAIR+ (voir docs/CHAIR_PLUS.md)
    Route::post('/support-requests', [SupportController::class, 'store']);
    Route::get('/support-requests/mine', [SupportController::class, 'mine']);
});
