<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Models\Notification;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Stratégies de suppression de compte — UN SEUL endroit pour les deux modes,
 * appelé par AuthController::deleteAccount (self-service RGPD) ET par
 * AdminBulkController (actions de masse Super Admin).
 *
 * Deux modes, choisis PAR LE SERVEUR selon le compte (jamais par l'admin) :
 *
 * - anonymize() : la stratégie historique de AuthController::deleteAccount,
 *   extraite ici SANS changement de comportement. La ligne `users` n'est PAS
 *   supprimée (elle porte des clés étrangères dont la destruction effacerait
 *   les données d'autres personnes : avis reçus par un coiffeur, historique
 *   d'un salon) — elle est vidée de tout ce qui identifie.
 *
 * - purgeDemo() : suppression physique complète, RÉSERVÉE aux comptes de
 *   démonstration (email @demo.getchair.app). S'appuie sur les cascades de
 *   clés étrangères (users -> hairdresser_profiles -> appointments/reviews/
 *   posts..., users -> salons(owner) -> job_offers/chair_rentals...), puis
 *   recalcule les compteurs cachés des profils RÉELS touchés par ricochet
 *   (followers_count, reviews_count/avg_rating, likes_count des posts).
 */
class AccountDeletionService
{
    public const DEMO_EMAIL_SUFFIX = '@demo.getchair.app';

    public static function isDemoAccount(User $user): bool
    {
        return Str::endsWith(strtolower($user->email), self::DEMO_EMAIL_SUFFIX);
    }

    /**
     * Anonymisation self-service — corps EXACT de l'ancienne transaction de
     * AuthController::deleteAccount (voir docs/app-store/ACCOUNT_AUDIT.md).
     * Supprime exactement ce que l'écran de confirmation annonce
     * (frontend/app/app/compte/supprimer) : avis laissés, réservations en
     * tant que client, notifications, favoris/abonnements/inspirations,
     * appareils liés — puis anonymise la ligne user (nom/email/mot de
     * passe/coordonnées) et révoque tous les tokens.
     */
    public static function anonymize(User $user): void
    {
        $id = (int) $user->id;

        DB::transaction(function () use ($user, $id) {
            Review::where('client_id', $id)->delete();
            Appointment::where('client_id', $id)->delete();
            Notification::where('user_id', $id)->delete();

            // Le compteur d'abonnés est un cache entretenu à la main par
            // InteractionController (increment/decrement) : le détacher sans
            // le recalculer laissait des coiffeurs affichant un abonné de
            // plus qu'ils n'en ont, définitivement.
            $followedIds = $user->follows()->pluck('hairdresser_profiles.id')->all();
            $user->follows()->detach();
            foreach ($followedIds as $followedId) {
                DB::table('hairdresser_profiles')->where('id', $followedId)->update([
                    'followers_count' => DB::table('follows')->where('hairdresser_id', $followedId)->count(),
                ]);
            }

            $user->savedProfiles()->detach();

            // Mêmes promesses que l'écran de confirmation, sur les tables qui
            // n'ont pas de modèle dédié. Le token push est le plus important :
            // laissé en base, il continue de désigner l'appareil de quelqu'un
            // qui a quitté CHAIR, et resterait notifiable.
            DB::table('saved_posts')->where('user_id', $id)->delete();
            DB::table('post_likes')->where('user_id', $id)->delete();
            DB::table('push_subscriptions')->where('user_id', $id)->delete();
            DB::table('notification_preferences')->where('user_id', $id)->delete();
            DB::table('user_preferences')->where('user_id', $id)->delete();
            DB::table('share_events')->where('user_id', $id)->delete();
            DB::table('support_requests')->where('user_id', $id)->delete();

            // Statistiques agrégées d'audience : le compteur de vues d'un
            // coiffeur tiers reste juste, mais plus rien ne le relie à la
            // personne partie (minimisation, 5.1.1(iii)).
            DB::table('profile_views')->where('viewer_user_id', $id)->update(['viewer_user_id' => null]);
            DB::table('stories')->where('user_id', $id)->delete();

            self::scrubHairdresserProfile($id);

            $user->tokens()->delete();

            $user->update([
                'name'        => 'Utilisateur supprimé',
                'email'       => 'deleted-' . $id . '-' . time() . '@getchair.invalid',
                'password'    => bcrypt(Str::random(40)),
                'avatar'      => null,
                'bio'         => null,
                'phone'       => null,
                'city'        => null,
                'postal_code' => null,
                'latitude'    => null,
                'longitude'   => null,
            ]);
        });
    }

    /** Un compte déjà passé par anonymize() — plus rien à supprimer. */
    public static function isAlreadyAnonymized(User $user): bool
    {
        return Str::endsWith($user->email, '@getchair.invalid');
    }

    /**
     * Purge physique d'un compte de DÉMONSTRATION. GARDE-FOU ABSOLU : refuse
     * (exception) tout compte dont l'email ne se termine pas par
     * @demo.getchair.app — la protection est ici, côté serveur, pas dans
     * l'interface.
     *
     * La suppression de la ligne `users` déclenche les cascades SQL (profil
     * coiffeur, salon possédé, RDV/avis/posts liés...). Les compteurs cachés
     * des profils réels touchés par ricochet sont recalculés après coup :
     * un avis d'un client démo sur un coiffeur réel disparaît en cascade,
     * il faut donc re-péréquater avg_rating/reviews_count du coiffeur réel.
     */
    public static function purgeDemo(User $user): void
    {
        if (!self::isDemoAccount($user)) {
            throw new \InvalidArgumentException(
                "purgeDemo() refuse le compte #{$user->id} ({$user->email}) : email hors du motif " . self::DEMO_EMAIL_SUFFIX
            );
        }

        $id = (int) $user->id;

        // Profils/posts qui perdront des données par cascade — collectés AVANT
        // la suppression pour recalculer leurs compteurs après.
        $followedProfileIds = DB::table('follows')->where('follower_id', $id)->pluck('hairdresser_id')->all();
        $reviewedProfileIds = DB::table('reviews')->where('client_id', $id)->pluck('hairdresser_id')->all();
        $likedPostIds       = DB::table('post_likes')->where('user_id', $id)->pluck('post_id')->all();
        $savedProfileIds    = DB::table('saved_profiles')->where('user_id', $id)->pluck('hairdresser_id')->all();

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete(); // cascades SQL : profil, salon possédé, contenus...
        });

        self::recalculateCounters(
            array_values(array_unique(array_merge($followedProfileIds, $reviewedProfileIds, $savedProfileIds))),
            $likedPostIds
        );
    }

    /**
     * Recalcule les compteurs cachés des profils/posts ENCORE EXISTANTS
     * après une purge (ceux supprimés en cascade sont ignorés d'office par
     * le whereIn sur la table).
     */
    public static function recalculateCounters(array $profileIds, array $postIds = []): void
    {
        $survivors = DB::table('hairdresser_profiles')->whereIn('id', $profileIds)->pluck('id')->all();
        foreach ($survivors as $pid) {
            DB::table('hairdresser_profiles')->where('id', $pid)->update([
                'followers_count' => DB::table('follows')->where('hairdresser_id', $pid)->count(),
                'reviews_count'   => DB::table('reviews')->where('hairdresser_id', $pid)->count(),
                'avg_rating'      => (float) (DB::table('reviews')->where('hairdresser_id', $pid)->avg('rating') ?? 0),
            ]);
        }

        $survivingPosts = DB::table('posts')->whereIn('id', $postIds)->pluck('id')->all();
        foreach ($survivingPosts as $postId) {
            DB::table('posts')->where('id', $postId)->update([
                'likes_count' => DB::table('post_likes')->where('post_id', $postId)->count(),
            ]);
        }
    }

    /**
     * Retire de la partie publique de CHAIR le profil coiffeur d'un compte
     * qui vient d'être supprimé (anonymisé).
     *
     * Sans ça, anonymiser la ligne `users` ne suffisait pas : la fiche
     * publique /app/coiffeur/{slug} restait en ligne et remontait toujours
     * dans la recherche par ville, avec l'adresse de travail, le compte
     * Instagram, le GPS exact, le SIRET — et le nom réel de la personne
     * conservé dans le slug de l'URL. Constaté en test réel (curl) avant
     * correctif, voir docs/app-store/ACCOUNT_AUDIT.md.
     *
     * `is_hidden` est le drapeau déjà respecté par HairdresserController
     * (index + show + classements) : le profil disparaît de la recherche et
     * la fiche répond 404. Les publications sont dépubliées pour la même
     * raison — le fil public ne filtre pas sur `is_hidden`, une photo du
     * portfolio y serait restée visible.
     */
    public static function scrubHairdresserProfile(int $userId): void
    {
        $profileIds = HairdresserProfile::where('user_id', $userId)->pluck('id')->all();
        if (empty($profileIds)) {
            return;
        }

        DB::table('posts')->whereIn('hairdresser_id', $profileIds)->update(['is_published' => false]);

        foreach ($profileIds as $profileId) {
            DB::table('hairdresser_profiles')->where('id', $profileId)->update([
                'slug'                 => 'profil-supprime-' . $profileId,
                'is_hidden'            => true,
                'hidden_reason'        => 'Compte supprimé par son titulaire',
                'hidden_at'            => now(),
                'tagline'              => null,
                'work_address'         => null,
                'instagram_url'        => null,
                'tiktok_url'           => null,
                'keywords'             => null,
                'banner_image'         => null,
                'booking_url'          => null,
                'siret'                => null,
                'diploma'              => null,
                'diploma_document_url' => null,
                'postal_code'          => null,
                'latitude'             => null,
                'longitude'            => null,
                'is_featured'          => false,
                'featured_until'       => null,
                'chair_pick_until'     => null,
                'updated_at'           => now(),
            ]);
        }
    }
}
