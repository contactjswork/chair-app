<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HairdresserProfile extends Model
{
    use HasFactory;

    // Coût nul (pas de requête, juste une comparaison de date sur une colonne
    // déjà chargée) contrairement à is_chair_plus — safe en $appends global,
    // donc visible partout où le modèle est sérialisé (recherche, profil,
    // portfolio) sans geste supplémentaire par contrôleur.
    protected $appends = ['is_chair_pick'];

    // Colonnes internes de l'ancien niveau global (refonte 31/08/2026) :
    // conservées pour l'admin et le tri, mais plus jamais sérialisées — la
    // seule échelle visible est le niveau par spécialité.
    protected $hidden = ['chair_score', 'chair_level', 'chair_score_adjustment'];

    protected $fillable = [
        'user_id', 'salon_id', 'slug', 'banner_image', 'tagline',
        'years_experience', 'diploma', 'diploma_document_url', 'diploma_status', 'city', 'postal_code',
        'department', 'region',
        'latitude', 'longitude', 'is_independent', 'work_status', 'work_address', 'work_availability', 'is_verified',
        'followers_count', 'posts_count', 'avg_rating', 'reviews_count', 'visits_count', 'verified_visits_count',
        'instagram_url', 'tiktok_url', 'booking_url', 'google_review_url', 'keywords',
        'identity_verified', 'pro_active_badge', 'booking_window_days',
        'featured_until', 'chair_plus_until', 'chair_pick_until', 'chair_plus_test_mode',
        'siret', 'siret_verification_status', 'pro_goals',
    ];

    protected $casts = [
        'loyalty_addon_until' => 'datetime',
        'is_independent'       => 'boolean',
        'is_verified'          => 'boolean',
        'identity_verified'    => 'boolean',
        'pro_active_badge'     => 'boolean',
        'avg_rating'           => 'decimal:2',
        'featured_until'       => 'datetime',
        'chair_plus_until'     => 'datetime',
        'chair_pick_until'     => 'datetime',
        'chair_plus_test_mode' => 'boolean',
        'pro_goals'            => 'array',
        // Colonnes DECIMAL(10,7) : sans ces casts, PDO les remonte en CHAÎNES
        // et l'API sérialise "48.5690000" au lieu de 48.569. Une chaîne passée
        // à Apple Plans lève « `latitude` is not a number » et emporte la page
        // entière — c'est ce qui a fait tomber la recherche le 27/08/2026.
        // /explore s'en sortait parce qu'il convertit à la main
        // (ExploreController), mais /hairdressers/{slug} renvoyait bien des
        // chaînes. Les convertir à la source évite d'avoir à s'en souvenir
        // dans chaque nouveau consommateur.
        'latitude'             => 'float',
        'longitude'            => 'float',
    ];

    /** "Coup de cœur CHAIR" — sélection éditoriale manuelle, jamais liée à l'abonnement. */
    public function getIsChairPickAttribute(): bool
    {
        return $this->chair_pick_until !== null && now()->lt($this->chair_pick_until);
    }

    /**
     * is_featured reste vrai en permanence si posé manuellement (admin), OU
     * temporairement si un boost local (récompense parrainage) est encore
     * actif — mêmes lectures partout dans HairdresserController, aucun appel
     * site à changer.
     */
    public function getIsFeaturedAttribute($value): bool
    {
        if ($value) return true;
        return $this->featured_until !== null && now()->lt($this->featured_until);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * CHAIR+ actif — un SEUL point de vérité, quelle que soit la source :
     *  0. mode test (chair_plus_test_mode, admin uniquement — voir
     *     AdminHairdresserController::setChairPlusTest, aucun rapport avec un
     *     vrai abonnement ni avec le parrainage, jamais accessible à un
     *     utilisateur normal) ;
     *  1. banqué (récompense parrainage, chair_plus_until) ;
     *  2. abonnement payé individuel (subscriptions.plan = chair_plus) ;
     *  3. abonnement CHAIR BUSINESS du salon (couvre toute l'équipe).
     * Rien d'autre dans le code ne doit vérifier ces sources séparément.
     */
    /**
     * L add-on Carte de fidelite — distinct de CHAIR+. Paiement a venir
     * (Stripe) ; en attendant l activation est manuelle cote admin.
     */
    public function hasLoyaltyAddon(): bool
    {
        return $this->loyalty_addon_until !== null
            && $this->loyalty_addon_until->isFuture();
    }
    public function hasChairPlus(): bool
    {
        if ($this->chair_plus_test_mode) {
            return true;
        }

        if ($this->chair_plus_until !== null && now()->lt($this->chair_plus_until)) {
            return true;
        }

        $own = $this->subscriptions()
            ->where('plan', 'chair_plus')
            ->whereIn('status', ['trialing', 'active', 'past_due'])
            ->latest('id')
            ->first();
        if ($own && $own->coversToday()) return true;

        if ($this->salon_id) {
            $salonSub = Subscription::where('salon_id', $this->salon_id)
                ->where('plan', 'chair_business')
                ->whereIn('status', ['trialing', 'active', 'past_due'])
                ->latest('id')
                ->first();
            if ($salonSub && $salonSub->coversToday()) return true;
        }

        return false;
    }

    /**
     * Accesseur exposé explicitement (jamais via $appends global — hasChairPlus()
     * coûte jusqu'à 2 requêtes ; l'ajouter partout ferait un N+1 sur les listes
     * de recherche). À appeler via ->append('is_chair_plus') uniquement sur les
     * réponses "profil unique" (auth, /profile) qui pilotent le déverrouillage
     * des fonctionnalités CHAIR+ côté frontend.
     */
    public function getIsChairPlusAttribute(): bool
    {
        return $this->hasChairPlus();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function specialties()
    {
        return $this->belongsToMany(Specialty::class, 'hairdresser_specialties', 'hairdresser_id', 'specialty_id');
    }

    public function posts()
    {
        return $this->hasMany(Post::class, 'hairdresser_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'hairdresser_id');
    }

    public function followers()
    {
        return $this->belongsToMany(User::class, 'follows', 'hairdresser_id', 'follower_id');
    }

    public function serviceCategories()
    {
        return $this->hasMany(ServiceCategory::class, 'hairdresser_id')->orderBy('display_order');
    }

    public function services()
    {
        return $this->hasMany(Service::class, 'hairdresser_id');
    }

    public function schedules()
    {
        return $this->hasMany(HairdresserSchedule::class, 'hairdresser_id')->orderBy('day_of_week');
    }

    public function unavailabilities()
    {
        return $this->hasMany(HairdresserUnavailability::class, 'hairdresser_id');
    }

    public function verifiedVisits()
    {
        return $this->hasMany(VerifiedVisit::class, 'hairdresser_id');
    }

    public function qrTokens()
    {
        return $this->hasMany(QrToken::class, 'hairdresser_id');
    }

    public function trainingBadges()
    {
        return $this->belongsToMany(TrainingBadge::class, 'hairdresser_training_badges', 'hairdresser_profile_id', 'training_badge_id')
                    ->withPivot('year', 'is_verified', 'created_at');
    }
}
