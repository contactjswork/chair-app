<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * chair:launch-cleanup — remet la prod à zéro pour le lancement public.
 *
 * Supprime UNIQUEMENT les comptes de démonstration :
 *   - le jeu de démo (e-mails en @demo.getchair.app, créés par chair:demo-reset) ;
 *   - avec --review, aussi les 3 comptes App Review (review.*@getchair.app),
 *     recréables à tout moment par chair:make-preview-accounts.
 * Tout autre compte (vrais utilisateurs, équipe, admins) est conservé.
 *
 * Aperçu par défaut : rien n'est modifié sans --force.
 */
class LaunchCleanup extends Command
{
    protected $signature = 'chair:launch-cleanup
        {--review : Supprimer aussi les 3 comptes App Review}
        {--force : Exécuter réellement (sinon simple aperçu)}';

    protected $description = 'Supprime les comptes de démonstration avant le lancement public';

    private const REVIEW_EMAILS = ['review.client@getchair.app', 'review.coiffeur@getchair.app', 'review.gerant@getchair.app'];

    public function handle(): int
    {
        $query = DB::table('users')->where('email', 'like', '%@demo.getchair.app');
        if ($this->option('review')) {
            $query->orWhereIn('email', self::REVIEW_EMAILS);
        }
        // Garde-fou absolu : jamais un admin ni l'équipe fondatrice.
        $delUsers = $query->get(['id', 'name', 'email', 'role', 'admin_role_id'])
            ->reject(fn ($u) => $u->admin_role_id !== null
                || stripos($u->name, 'schillinger') !== false
                || stripos($u->name, 'koehler') !== false);

        $delUserIds    = $delUsers->pluck('id')->all();
        $delProfileIds = DB::table('hairdresser_profiles')->whereIn('user_id', $delUserIds ?: [0])->pluck('id')->all();
        $delSalonIds   = DB::table('salons')->whereIn('owner_id', $delUserIds ?: [0])->pluck('id')->all();

        $kept = DB::table('users')->whereNotIn('id', $delUserIds ?: [0])->orderBy('id')->get(['id', 'name', 'email', 'role']);

        $this->info('À SUPPRIMER : ' . count($delUserIds) . ' comptes, ' . count($delProfileIds) . ' profils coiffeur, ' . count($delSalonIds) . ' salons.');
        $reviewLeft = DB::table('users')->whereIn('email', self::REVIEW_EMAILS)->whereNotIn('id', $delUserIds ?: [0])->count();
        if ($reviewLeft) {
            $this->line("  ({$reviewLeft} compte(s) App Review conservé(s) — ajoutez --review pour les supprimer aussi)");
        }
        $this->newLine();
        $this->info('CONSERVÉS (' . $kept->count() . ') — vérifiez qu\'il n\'y a que de vrais comptes :');
        foreach ($kept as $u) {
            $this->line("  #{$u->id}  {$u->name}  <{$u->email}>  ({$u->role})");
        }

        if (!$this->option('force')) {
            $this->newLine();
            $this->warn('Aperçu seulement — rien n\'a été modifié. Relancez avec --force pour exécuter.');
            return self::SUCCESS;
        }
        if (empty($delUserIds)) {
            $this->info('Rien à supprimer.');
            return self::SUCCESS;
        }

        $delPostIds   = DB::table('posts')->whereIn('hairdresser_id', $delProfileIds ?: [0])->pluck('id')->all();
        $delOfferIds  = DB::table('job_offers')->whereIn('salon_id', $delSalonIds ?: [0])->pluck('id')->all();
        $delRentalIds = DB::table('chair_rentals')->whereIn('salon_id', $delSalonIds ?: [0])->pluck('id')->all();
        $delRequestIds = DB::table('chair_rental_requests')
            ->where(fn ($w) => $w->whereIn('chair_rental_id', $delRentalIds ?: [0])->orWhereIn('hairdresser_id', $delProfileIds ?: [0]))
            ->pluck('id')->all();

        $in = fn ($q, string $col, array $ids) => empty($ids) ? $q->whereRaw('0=1') : $q->whereIn($col, $ids);
        $purge = function (string $table, \Closure $where) {
            if (!Schema::hasTable($table)) return;
            $n = $where(DB::table($table))->delete();
            $this->line("  {$table} : {$n}");
        };

        DB::transaction(function () use ($purge, $in, $delUserIds, $delProfileIds, $delSalonIds, $delPostIds, $delOfferIds, $delRentalIds, $delRequestIds) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            $purge('post_images', fn ($q) => $in($q, 'post_id', $delPostIds));
            $purge('post_tags',   fn ($q) => $in($q, 'post_id', $delPostIds));
            $purge('post_likes',  fn ($q) => $q->where(fn ($w) => $in($w, 'post_id', $delPostIds)->orWhereIn('user_id', $delUserIds)));
            $purge('saved_posts', fn ($q) => $q->where(fn ($w) => $in($w, 'post_id', $delPostIds)->orWhereIn('user_id', $delUserIds)));
            $purge('posts',       fn ($q) => $in($q, 'id', $delPostIds));

            $purge('services',           fn ($q) => $in($q, 'hairdresser_id', $delProfileIds));
            $purge('service_categories', fn ($q) => $in($q, 'hairdresser_id', $delProfileIds));
            foreach (['hairdresser_schedules', 'hairdresser_unavailabilities', 'hairdresser_specialties', 'hairdresser_specialty_progress', 'hairdresser_streaks', 'verified_visits', 'qr_tokens'] as $t) {
                $purge($t, fn ($q) => $in($q, 'hairdresser_id', $delProfileIds));
            }
            foreach (['hairdresser_badges', 'hairdresser_training_badges'] as $t) {
                $purge($t, fn ($q) => $in($q, 'hairdresser_profile_id', $delProfileIds));
            }
            $purge('profile_views', fn ($q) => Schema::hasColumn('profile_views', 'hairdresser_profile_id')
                ? $in($q, 'hairdresser_profile_id', $delProfileIds)
                : $in($q, 'hairdresser_id', $delProfileIds));

            $purge('appointments',   fn ($q) => $q->where(fn ($w) => $in($w, 'hairdresser_id', $delProfileIds)->orWhereIn('client_id', $delUserIds)));
            $purge('reviews',        fn ($q) => $q->where(fn ($w) => $in($w, 'hairdresser_id', $delProfileIds)->orWhereIn('client_id', $delUserIds)));
            $purge('follows',        fn ($q) => $q->where(fn ($w) => $in($w, 'hairdresser_id', $delProfileIds)->orWhereIn('follower_id', $delUserIds)));
            $purge('saved_profiles', fn ($q) => $q->where(fn ($w) => $in($w, 'hairdresser_id', $delProfileIds)->orWhereIn('user_id', $delUserIds)));

            foreach (['notifications', 'notification_preferences', 'personal_access_tokens', 'push_subscriptions', 'user_preferences', 'support_requests', 'referral_rewards', 'share_events', 'product_events'] as $t) {
                if (Schema::hasTable($t) && Schema::hasColumn($t, 'user_id')) $purge($t, fn ($q) => $in($q, 'user_id', $delUserIds));
            }
            $purge('personal_access_tokens', fn ($q) => $q->where('tokenable_type', 'App\\Models\\User')->whereIn('tokenable_id', $delUserIds));
            $purge('reports', fn ($q) => $q->where(fn ($w) => $in($w, 'reporter_id', $delUserIds)->orWhereIn('reported_user_id', $delUserIds)));

            $purge('subscriptions', fn ($q) => $q->where(fn ($w) => $in($w, 'hairdresser_profile_id', $delProfileIds)->orWhereIn('salon_id', $delSalonIds)));
            $purge('job_applications', fn ($q) => $q->where(fn ($w) => $in($w, 'job_offer_id', $delOfferIds)->orWhereIn('hairdresser_id', $delProfileIds)));
            $purge('job_offers', fn ($q) => $in($q, 'id', $delOfferIds));
            $purge('chair_rental_payments', fn ($q) => $in($q, 'chair_rental_request_id', $delRequestIds));
            $purge('chair_rental_request_messages', fn ($q) => $in($q, 'chair_rental_request_id', $delRequestIds));
            $purge('chair_rental_requests', fn ($q) => $in($q, 'id', $delRequestIds));
            $purge('chair_rentals', fn ($q) => $in($q, 'id', $delRentalIds));
            $purge('salon_join_requests', fn ($q) => $q->where(fn ($w) => $in($w, 'salon_id', $delSalonIds)->orWhereIn('hairdresser_id', $delProfileIds)));
            $purge('salon_invitations', fn ($q) => $in($q, 'salon_id', $delSalonIds));

            $purge('salons', fn ($q) => $in($q, 'id', $delSalonIds));
            $purge('hairdresser_profiles', fn ($q) => $in($q, 'id', $delProfileIds));
            $purge('users', fn ($q) => $in($q, 'id', $delUserIds));

            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            // Vrais coiffeurs rattachés à un salon de démo : détachés, pas supprimés.
            if (!empty($delSalonIds)) DB::table('hairdresser_profiles')->whereIn('salon_id', $delSalonIds)->update(['salon_id' => null]);
        });

        // Les compteurs mis en cache (avis, abonnés…) des vrais profils restent justes :
        // seuls des profils de démo avaient des relations avec d'autres comptes de démo.
        cache()->forget('sitemap_slugs');

        $this->newLine();
        $this->info('Nettoyage terminé.');
        return self::SUCCESS;
    }
}
