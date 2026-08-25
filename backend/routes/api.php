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
use App\Http\Controllers\Api\NotificationPreferenceController;
use App\Http\Controllers\Api\PushTokenController;
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
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AdminBulkController;
use App\Http\Controllers\Api\AdminHairdresserController;
use App\Http\Controllers\Api\AdminSalonController;
use App\Http\Controllers\Api\SpecialtyProgressController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminAccountController;
use App\Http\Controllers\Api\AdminAuditLogController;
use App\Http\Controllers\Api\AdminFeatureFlagController;
use App\Http\Controllers\Api\AdminAppSettingController;
use App\Http\Controllers\Api\AdminBadgeController;
use App\Http\Controllers\Api\AdminSpecialtyController;
use App\Http\Controllers\Api\AdminInsightController;
use App\Http\Controllers\Api\FeatureFlagController;
use App\Http\Controllers\Api\AppConfigController;
use App\Http\Controllers\Api\MapKitTokenController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserBlockController;

// Admin — authentification par compte Sanctum réel (role='admin' + un
// admin_role granulaire), PLUS de jeton statique partagé. Voir
// EnsureAdminAuthenticated ('admin.auth') et EnsureAdminPermission
// ('admin.permission:<clé>') pour le détail de la garde. L'ancien
// middleware 'admin.token' (EnsureAdminToken) n'est plus branché sur aucune
// route — conservé en fichier seulement, voir son docblock.
Route::prefix('admin/auth')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login'])->middleware('throttle:6,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AdminAuthController::class, 'me']);
        Route::post('/logout', [AdminAuthController::class, 'logout']);
    });
});

Route::prefix('admin')->middleware(['auth:sanctum', 'admin.auth'])->group(function () {
    Route::get('/stats',                        [AdminController::class, 'stats'])->middleware('admin.permission:dashboard.view');
    // Premier écran admin : "aujourd'hui"/"cette semaine" + alertes (voir
    // rapport de mission "Statistiques et Insights").
    Route::get('/dashboard/today',              [AdminController::class, 'dashboardToday'])->middleware('admin.permission:dashboard.view');
    Route::get('/top-hairdressers',             [AdminController::class, 'topHairdressers'])->middleware('admin.permission:dashboard.view');
    Route::get('/activity',                     [AdminController::class, 'recentActivity'])->middleware('admin.permission:dashboard.view');
    Route::get('/users',                        [AdminUserController::class, 'index'])->middleware('admin.permission:users.read');
    // Actions de masse (sélection multiple / "tous les filtrés") — la
    // permission fine par action (users.suspend, users.delete,
    // hairdressers.visibility...) est vérifiée DANS le contrôleur selon
    // le champ `action` ; la route ne porte que le socle users.read.
    // Déclarée AVANT /users/{id} pour ne jamais matcher 'bulk' comme un id.
    Route::post('/users/bulk',                  [AdminBulkController::class, 'bulkUsers'])->middleware('admin.permission:users.read');
    // Maintenance — données de démonstration (@demo.getchair.app) : analyse
    // chiffrée puis purge physique à confirmation forte. Réservé users.delete.
    Route::get('/demo-data/analyze',            [AdminBulkController::class, 'analyzeDemoData'])->middleware('admin.permission:users.delete');
    Route::post('/demo-data/purge',             [AdminBulkController::class, 'purgeDemoData'])->middleware('admin.permission:users.delete');
    Route::get('/users/{id}',                   [AdminUserController::class, 'show'])->middleware('admin.permission:users.read');
    Route::post('/users/{id}/suspend',          [AdminUserController::class, 'suspendUser'])->middleware('admin.permission:users.suspend');
    Route::post('/users/{id}/unsuspend',        [AdminUserController::class, 'unsuspendUser'])->middleware('admin.permission:users.suspend');
    Route::delete('/users/{id}',                [AdminUserController::class, 'deleteUser'])->middleware('admin.permission:users.delete');
    // Badges/points — voir rapport de mission "Utilisateurs". badge_code en
    // dernier segment (pas en query) pour rester RESTful et cohérent avec le
    // reste des routes admin à ressource imbriquée.
    Route::post('/users/{id}/badges',                 [AdminUserController::class, 'assignBadge'])->middleware('admin.permission:hairdressers.badges_manage');
    Route::delete('/users/{id}/badges/{badgeCode}',    [AdminUserController::class, 'removeBadge'])->middleware('admin.permission:hairdressers.badges_manage');
    Route::post('/users/{id}/points-adjust',           [AdminUserController::class, 'adjustPoints'])->middleware('admin.permission:users.points_adjust');

    Route::get('/hairdressers',                 [AdminHairdresserController::class, 'index'])->middleware('admin.permission:hairdressers.read');
    Route::get('/hairdressers/{id}',             [AdminHairdresserController::class, 'show'])->middleware('admin.permission:hairdressers.read');
    Route::post('/hairdressers/{id}/verify',     [AdminHairdresserController::class, 'verify'])->middleware('admin.permission:hairdressers.verify');
    Route::post('/hairdressers/{id}/unverify',   [AdminHairdresserController::class, 'unverify'])->middleware('admin.permission:hairdressers.verify');
    Route::post('/hairdressers/{id}/hide',       [AdminHairdresserController::class, 'hide'])->middleware('admin.permission:hairdressers.visibility');
    Route::post('/hairdressers/{id}/unhide',     [AdminHairdresserController::class, 'unhide'])->middleware('admin.permission:hairdressers.visibility');
    Route::get('/appointments',                 [AdminController::class, 'appointments'])->middleware('admin.permission:appointments.read');
    Route::get('/reviews',                      [AdminController::class, 'reviews'])->middleware('admin.permission:content.moderate');
    Route::post('/reviews/{id}/hide',           [AdminController::class, 'hideReview'])->middleware('admin.permission:content.moderate');
    Route::post('/reviews/{id}/show',           [AdminController::class, 'showReview'])->middleware('admin.permission:content.moderate');
    Route::post('/reviews/{id}/mark-reviewed',  [AdminController::class, 'markReviewReviewed'])->middleware('admin.permission:content.moderate');
    Route::delete('/reviews/{id}',              [AdminController::class, 'deleteReview'])->middleware('admin.permission:content.moderate');
    Route::get('/reports',                      [AdminController::class, 'reports'])->middleware('admin.permission:reports.manage');
    Route::post('/reports/{id}/ignore',         [AdminController::class, 'ignoreReport'])->middleware('admin.permission:reports.manage');
    Route::post('/reports/{id}/delete-content', [AdminController::class, 'deleteReportContent'])->middleware('admin.permission:reports.manage');
    // Vue d'ensemble modération unifiée — voir AdminController::moderationSummary().
    Route::get('/moderation/summary',           [AdminController::class, 'moderationSummary'])->middleware('admin.permission:content.moderate');
    Route::get('/subscriptions',                [AdminController::class, 'subscriptions'])->middleware('admin.permission:subscriptions.read');
    Route::get('/diplomas/pending',             [AdminHairdresserController::class, 'pendingDiplomas'])->middleware('admin.permission:hairdressers.verify');
    Route::post('/diplomas/{id}/approve',       [AdminHairdresserController::class, 'approveDiploma'])->middleware('admin.permission:hairdressers.verify');
    Route::post('/diplomas/{id}/reject',        [AdminHairdresserController::class, 'rejectDiploma'])->middleware('admin.permission:hairdressers.verify');
    Route::get('/analytics',                    [AdminController::class, 'analyticsStats'])->middleware('admin.permission:analytics.read');
    // Insights business (voir rapport de mission "Statistiques et Insights") :
    // demande (proxy préférences) vs offre réelle par ville x spécialité, et
    // couverture géographique clients vs professionnels par ville.
    Route::get('/insights/demand-supply',       [AdminInsightController::class, 'demandSupply'])->middleware('admin.permission:analytics.read');
    Route::get('/insights/geo-coverage',        [AdminInsightController::class, 'geoCoverage'])->middleware('admin.permission:analytics.read');
    Route::post('/notifications/send',          [AdminController::class, 'sendNotification'])->middleware('admin.permission:notifications.send');
    Route::get('/notifications/history',        [AdminController::class, 'notificationHistory'])->middleware('admin.permission:notifications.send');
    Route::post('/hairdressers/{id}/chair-pick',   [AdminHairdresserController::class, 'setChairPick'])->middleware('admin.permission:hairdressers.chair_pick');
    Route::delete('/hairdressers/{id}/chair-pick', [AdminHairdresserController::class, 'removeChairPick'])->middleware('admin.permission:hairdressers.chair_pick');
    // Mode test CHAIR+ (spec CHAIR+ §3) — activer/désactiver sans Stripe, réservé admin.
    Route::post('/hairdressers/{id}/chair-plus-test',   [AdminHairdresserController::class, 'setChairPlusTest'])->middleware('admin.permission:hairdressers.chair_plus_test');
    Route::delete('/hairdressers/{id}/chair-plus-test', [AdminHairdresserController::class, 'removeChairPlusTest'])->middleware('admin.permission:hairdressers.chair_plus_test');
    Route::get('/support-requests',                [AdminController::class, 'supportRequests'])->middleware('admin.permission:support.manage');
    Route::post('/support-requests/{id}/resolve',  [AdminController::class, 'resolveSupportRequest'])->middleware('admin.permission:support.manage');

    // Salons — module neuf (voir rapport de mission "Salons"). PAS de
    // transfert de propriété (owner_id) dans cette passe, voir docblock
    // AdminSalonController.
    Route::get('/salons',                            [AdminSalonController::class, 'index'])->middleware('admin.permission:salons.read');
    Route::get('/salons/{id}',                        [AdminSalonController::class, 'show'])->middleware('admin.permission:salons.read');
    Route::patch('/salons/{id}',                      [AdminSalonController::class, 'update'])->middleware('admin.permission:salons.manage');
    Route::post('/salons/{id}/verify',                [AdminSalonController::class, 'verify'])->middleware('admin.permission:salons.manage');
    Route::post('/salons/{id}/unverify',              [AdminSalonController::class, 'unverify'])->middleware('admin.permission:salons.manage');
    Route::post('/salons/{id}/suspend',               [AdminSalonController::class, 'suspend'])->middleware('admin.permission:salons.manage');
    Route::post('/salons/{id}/unsuspend',             [AdminSalonController::class, 'unsuspend'])->middleware('admin.permission:salons.manage');
    Route::delete('/salons/{salonId}/members/{profileId}', [AdminSalonController::class, 'removeMember'])->middleware('admin.permission:salons.manage');

    // Gestion des comptes admin eux-mêmes — réservé Super Admin par défaut
    // (voir seed migration : 'admins.manage' n'est mappé à aucun rôle sauf
    // via le bypass super_admin).
    Route::get('/admins',                       [AdminAccountController::class, 'index'])->middleware('admin.permission:admins.manage');
    Route::get('/admin-roles',                  [AdminAccountController::class, 'roles'])->middleware('admin.permission:admins.manage');
    Route::post('/admins',                      [AdminAccountController::class, 'store'])->middleware('admin.permission:admins.manage');
    Route::patch('/admins/{id}',                [AdminAccountController::class, 'update'])->middleware('admin.permission:admins.manage');
    Route::post('/admins/{id}/deactivate',      [AdminAccountController::class, 'deactivate'])->middleware('admin.permission:admins.manage');

    Route::get('/audit-logs',                   [AdminAuditLogController::class, 'index'])->middleware('admin.permission:audit_logs.read');

    // Feature flags — CRUD réservé 'feature_flags.manage' (super_admin par
    // défaut, voir seed migration). Toute écriture invalide le cache public
    // GET /api/feature-flags et journalise dans admin_audit_logs.
    Route::get('/feature-flags',                 [AdminFeatureFlagController::class, 'index'])->middleware('admin.permission:feature_flags.manage');
    Route::post('/feature-flags',                [AdminFeatureFlagController::class, 'store'])->middleware('admin.permission:feature_flags.manage');
    Route::patch('/feature-flags/{id}',           [AdminFeatureFlagController::class, 'update'])->middleware('admin.permission:feature_flags.manage');
    Route::delete('/feature-flags/{id}',          [AdminFeatureFlagController::class, 'destroy'])->middleware('admin.permission:feature_flags.manage');
    Route::post('/feature-flags/reset',           [AdminFeatureFlagController::class, 'resetAll'])->middleware('admin.permission:feature_flags.manage');

    // App settings — CRUD réservé 'settings.update' (super_admin par défaut).
    // GET reste sous cette même permission : pas de permission 'settings.read'
    // séparée dans le découpage de l'agent précédent (voir son rapport (e)).
    Route::get('/settings',                       [AdminAppSettingController::class, 'index'])->middleware('admin.permission:settings.update');
    Route::post('/settings',                      [AdminAppSettingController::class, 'store'])->middleware('admin.permission:settings.update');
    Route::patch('/settings/{id}',                 [AdminAppSettingController::class, 'update'])->middleware('admin.permission:settings.update');
    Route::delete('/settings/{id}',                [AdminAppSettingController::class, 'destroy'])->middleware('admin.permission:settings.update');
    Route::post('/settings/{group}/reset',         [AdminAppSettingController::class, 'resetGroup'])->middleware('admin.permission:settings.update');

    // Badges — catalogue administrable (table 'badges', voir BadgeService et
    // AdminBadgeController). Pas de destroy() : "désactiver" seulement, voir
    // docblock du contrôleur.
    Route::get('/badges',            [AdminBadgeController::class, 'index'])->middleware('admin.permission:badges.manage');
    Route::post('/badges',           [AdminBadgeController::class, 'store'])->middleware('admin.permission:badges.manage');
    Route::patch('/badges/{id}',     [AdminBadgeController::class, 'update'])->middleware('admin.permission:badges.manage');
    Route::post('/badges/reorder',   [AdminBadgeController::class, 'reorder'])->middleware('admin.permission:badges.manage');

    // Spécialités — CRUD complet, suppression protégée si utilisée (voir
    // AdminSpecialtyController).
    Route::get('/specialties',           [AdminSpecialtyController::class, 'index'])->middleware('admin.permission:specialties.manage');
    Route::post('/specialties',          [AdminSpecialtyController::class, 'store'])->middleware('admin.permission:specialties.manage');
    Route::patch('/specialties/{id}',    [AdminSpecialtyController::class, 'update'])->middleware('admin.permission:specialties.manage');
    Route::post('/specialties/{id}/image',  [AdminSpecialtyController::class, 'uploadImage'])->middleware('admin.permission:specialties.manage');
    Route::delete('/specialties/{id}/image',[AdminSpecialtyController::class, 'removeImage'])->middleware('admin.permission:specialties.manage');
    Route::post('/specialties/{id}/hide',   [AdminSpecialtyController::class, 'hide'])->middleware('admin.permission:specialties.manage');
    Route::post('/specialties/{id}/unhide', [AdminSpecialtyController::class, 'unhide'])->middleware('admin.permission:specialties.manage');
    Route::delete('/specialties/{id}',   [AdminSpecialtyController::class, 'destroy'])->middleware('admin.permission:specialties.manage');
    Route::post('/specialties/reorder',  [AdminSpecialtyController::class, 'reorder'])->middleware('admin.permission:specialties.manage');
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

// Configuration dynamique — publiques, en cache, jamais bloquantes (voir
// FeatureFlagService / AppConfigController pour le contrat de repli).
Route::get('/feature-flags', [FeatureFlagController::class, 'index']);
Route::get('/app-config', [AppConfigController::class, 'index']);
Route::get('/geocode', [GeocodingController::class, 'geocode']);
Route::get('/mapkit-token', [MapKitTokenController::class, 'token'])->middleware('throttle:30,1');
Route::get('/geo/regions', [GeoController::class, 'regions']);
Route::get('/geo/departments', [GeoController::class, 'departments']);
Route::get('/geo/search-city', [GeoController::class, 'searchCity'])->middleware('throttle:30,1');
Route::get('/geo/search-address', [GeoController::class, 'searchAddress'])->middleware('throttle:30,1');
Route::get('/geo/reverse-city', [GeoController::class, 'reverseCity'])->middleware('throttle:30,1');
// Page publique /parrainage/{code} (visiteur non connecté qui ouvre un lien
// de parrainage) — juste de quoi personnaliser l'accueil ("X vous invite"),
// jamais de données sensibles. Throttle contre l'énumération de codes.
Route::get('/referral-info/{code}', [ReferralController::class, 'info'])->middleware('throttle:20,1');
Route::get('/search', [SearchController::class, 'search']);
Route::get('/search/suggestions', [SearchController::class, 'suggestions']);
Route::get('/explore', [App\Http\Controllers\Api\ExploreController::class, 'index']);
// Recommandations — point d'entrée home (voir RecommendationController). Publique
// (visiteur = lat/lng+interests en query) mais personnalisée dès qu'un Bearer
// Sanctum valide accompagne la requête (résolu manuellement dans le contrôleur).
Route::get('/recommendations', [App\Http\Controllers\Api\RecommendationController::class, 'index']);
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
    Route::get('/preferences',  [PreferenceController::class, 'show']);

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
    // Sortie côté client : PUT /appointments/{id}/status au-dessus est réservé
    // au coiffeur (il exige un hairdresserProfile). Sans cette route, l'app
    // cliente laissait réserver sans jamais permettre d'annuler.
    // L'autorisation est faite dans clientCancel() sur le client_id de la ligne.
    Route::put('/appointments/{id}/cancel',             [AppointmentController::class, 'clientCancel'])->middleware('throttle:20,1');
    Route::post('/appointments/{id}/review',            [AppointmentController::class, 'submitReview']);

    // Réponses aux avis (coiffeur)
    Route::post('/reviews/{id}/reply',                  [ReviewController::class, 'reply']);

    // Notifications
    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::post('/notifications/read-all',   [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',  [NotificationController::class, 'markRead']);

    // Préférences de notifications (respectées à l'envoi — voir NotificationService::shouldSend)
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'show']);
    Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);

    // Tokens push APNs des appareils (enregistrés au démarrage de l'app native,
    // désinscrits à la déconnexion) — voir PushTokenController
    Route::post('/push/register',   [PushTokenController::class, 'register']);
    Route::delete('/push/register', [PushTokenController::class, 'unregister']);

    // Catégories de services
    Route::get('/service-categories',          [ServiceController::class, 'indexCategories']);
    Route::post('/service-categories',         [ServiceController::class, 'storeCategory']);
    Route::put('/service-categories/{id}',     [ServiceController::class, 'updateCategory']);
    Route::delete('/service-categories/{id}',  [ServiceController::class, 'destroyCategory']);

    // Services
    Route::get('/services',                    [ServiceController::class, 'indexServices']);
    Route::post('/services',                   [ServiceController::class, 'storeService']);
    Route::put('/services/{id}',                [ServiceController::class, 'updateService']);
    Route::delete('/services/{id}',              [ServiceController::class, 'destroyService']); // désactive (réversible)
    Route::post('/services/{id}/duplicate',     [ServiceController::class, 'duplicateService']);
    Route::delete('/services/{id}/permanent',   [ServiceController::class, 'permanentlyDestroyService']); // supprime réellement, bloqué si historique

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

    // ── Modération communautaire (App Store Review Guideline 1.2 — UGC) ──
    // Signalement de contenu : alimente enfin la table 'reports' déjà lue par
    // la file de modération admin (GET /admin/reports). Throttlé pour qu'un
    // compte ne puisse pas noyer la file.
    Route::post('/reports', [ReportController::class, 'store'])->middleware('throttle:15,60');

    // Blocage d'utilisateur — effet réel : le contenu du compte bloqué
    // disparaît du feed du bloqueur (filtrage dans HairdresserController::feed).
    Route::post('/users/{id}/block',   [UserBlockController::class, 'store'])->middleware('throttle:30,60');
    Route::delete('/users/{id}/block', [UserBlockController::class, 'destroy']);
    Route::get('/my-blocks',           [UserBlockController::class, 'index']);
});
