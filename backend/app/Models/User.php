<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name', 'email', 'password', 'role', 'avatar', 'city', 'postal_code', 'latitude', 'longitude', 'bio', 'phone',
        'referral_code', 'referred_by_user_id', 'active_pro_mode',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        // latitude/longitude sont des colonnes DECIMAL : sans ces casts, PDO
        // les remonte en CHAÎNES et l'API sérialise "48.5734000" au lieu de
        // 48.5734. Apple Plans refuse une chaîne et lève « `latitude` is not a
        // number » — la page Recherche plantait pour tout utilisateur connecté
        // ayant une ville, et jamais pour un visiteur.
        //
        // Correction d'une affirmation erronée écrite ici le 27/08/2026 :
        // HairdresserProfile ne castait rien du tout. Si les marqueurs de la
        // carte fonctionnaient, c'est parce qu'ExploreController convertit à
        // la main — /hairdressers/{slug}, lui, renvoyait bien des chaînes.
        // Les trois modèles concernés (User, HairdresserProfile, Salon) castent
        // désormais réellement.
        'latitude'          => 'float',
        'longitude'         => 'float',
    ];

    /**
     * Envoi du lien de réinitialisation — surcharge la notification Laravel
     * par défaut (texte anglais, gabarit Laravel) par l'email CHAIR.
     *
     * Appelé par Password::sendResetLink() depuis
     * AuthController::forgotPassword(). L'envoi est volontairement
     * non-bloquant : une panne SMTP ne doit pas transformer la demande en
     * erreur 500 côté app (la réponse reste la même dans tous les cas, elle ne
     * révèle jamais si l'email existe).
     *
     * Email de sécurité : aucune préférence de notification ne peut le bloquer
     * (on ne passe donc pas de type à MailService::send()).
     *
     * @param  string $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        \App\Services\MailService::send(
            (string) $this->getEmailForPasswordReset(),
            new \App\Mail\ResetPasswordMail(
                (string) ($this->name ?: ''),
                \App\Services\MailService::passwordResetUrl((string) $this->getEmailForPasswordReset(), $token),
                \App\Services\MailService::passwordResetExpireMinutes()
            ),
            $this->name
        );
    }

    public function hairdresserProfile()
    {
        return $this->hasOne(HairdresserProfile::class);
    }

    /** Rôle admin granulaire (super_admin|admin|moderator) — null si role != 'admin'. */
    public function adminRole()
    {
        return $this->belongsTo(AdminRole::class);
    }

    public function isAdminAccount(): bool
    {
        return $this->role === 'admin';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'admin' && $this->adminRole?->key === 'super_admin';
    }

    /**
     * Vérifie une permission granulaire (ex: 'users.suspend'). Un Super
     * Admin passe toujours — bypass volontaire, voir
     * 2026_08_17_110007_seed_admin_roles_and_permissions.php.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->role !== 'admin' || !$this->adminRole) {
            return false;
        }

        if ($this->adminRole->key === 'super_admin') {
            return true;
        }

        return $this->adminRole->permissions()->where('key', $permission)->exists();
    }

    /** Liste des clés de permission de ce compte admin — utile pour le frontend (afficher/cacher des actions). */
    public function adminPermissionKeys(): array
    {
        if ($this->role !== 'admin' || !$this->adminRole) {
            return [];
        }

        if ($this->adminRole->key === 'super_admin') {
            return Permission::pluck('key')->all();
        }

        return $this->adminRole->permissions()->pluck('key')->all();
    }

    public function salon()
    {
        return $this->hasOne(Salon::class, 'owner_id');
    }

    public function salons()
    {
        return $this->hasMany(Salon::class, 'owner_id');
    }

    public function follows()
    {
        return $this->belongsToMany(HairdresserProfile::class, 'follows', 'follower_id', 'hairdresser_id')
            ->withPivot('created_at');
    }

    public function savedProfiles()
    {
        return $this->belongsToMany(HairdresserProfile::class, 'saved_profiles', 'user_id', 'hairdresser_id');
    }

    public function isHairdresser(): bool
    {
        return $this->role === 'hairdresser';
    }

    public function isSalonOwner(): bool
    {
        return $this->role === 'salon_owner';
    }

    /** Double identité : ce compte possède-t-il un salon (Mode Gérant disponible) ? */
    public function canManageSalon(): bool
    {
        return $this->salon()->exists();
    }

    /** Double identité : ce compte a-t-il un profil coiffeur (Mode Coiffeur disponible) ? */
    public function hasHairdresserProfile(): bool
    {
        return $this->hairdresserProfile()->exists();
    }

    public function referredBy()
    {
        return $this->belongsTo(User::class, 'referred_by_user_id');
    }

    /** Utilisateurs que CE compte a parrainés (peu importe leur rôle). */
    public function referrals()
    {
        return $this->hasMany(User::class, 'referred_by_user_id');
    }
}
