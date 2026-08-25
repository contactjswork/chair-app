<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccountDeletionService;
use App\Services\AdminAuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Actions de masse Super Admin sur les utilisateurs + purge des données de
 * démonstration (points 22-33 de la liste de Julien).
 *
 * CHOIX D'ARCHITECTURE (progression) : la file Laravel est en QUEUE_CONNECTION
 * =sync (local ET production Infomaniak, vérifié dans .env) — pas de worker,
 * donc pas de job + polling. À la place, le FRONT envoie les ids lot par lot
 * (100 max par requête) après avoir obtenu la liste complète des ids
 * éligibles via dry_run ; il affiche « 74/112 » gratuitement entre deux lots.
 * C'est plus simple ET plus robuste qu'un job asynchrone : pas d'état
 * serveur, une requête qui échoue se rejoue, et la progression est exacte.
 * Le mode filters{} reste supporté (le backend résout lui-même le lot —
 * jamais 5000 ids dans une requête) avec un garde-fou de temps : au-delà de
 * ~25 s la requête s'arrête proprement et renvoie un résultat partiel
 * (remaining > 0) que le front relance.
 *
 * PROTECTIONS — toutes CÔTÉ SERVEUR, jamais seulement dans l'interface :
 * - l'admin courant n'est JAMAIS suspendable/supprimable en masse ;
 * - tout compte role='admin' OU admin_role_id non nul est retiré
 *   silencieusement des lots destructifs et signalé dans la réponse ;
 * - delete exige le mot de passe admin re-saisi (Hash::check) ET la phrase
 *   « SUPPRIMER N COMPTES » comparée ici au N réel ;
 * - le mode de suppression est choisi PAR LE SERVEUR : compte
 *   @demo.getchair.app → purge physique (cascades SQL), tout autre compte →
 *   anonymisation (stratégie RGPD existante de AuthController::deleteAccount,
 *   factorisée dans AccountDeletionService SANS changement de comportement).
 *
 * NOTE badges : PAS d'attribution de badges en masse, volontairement. Les
 * badges CHAIR sont CALCULÉS (BadgeService::computePoints/getUnlockedBadges)
 * à partir de métriques réelles ; l'octroi manuel existe individuellement
 * (admin_override) pour corriger un cas précis, mais un octroi de masse
 * fabriquerait des badges sans réalité métier. Décision documentée ici.
 */
class AdminBulkController extends Controller
{
    private const ACTIONS = ['suspend', 'unsuspend', 'hide', 'unhide', 'delete', 'export_csv'];

    /** Permission granulaire requise par action (en plus de users.read porté par la route). */
    private const ACTION_PERMISSIONS = [
        'suspend'    => 'users.suspend',
        'unsuspend'  => 'users.suspend',
        'hide'       => 'hairdressers.visibility',
        'unhide'     => 'hairdressers.visibility',
        'delete'     => 'users.delete',
        'export_csv' => 'users.read',
    ];

    /** Actions dont les comptes admin sont exclus d'office. */
    private const DESTRUCTIVE = ['suspend', 'hide', 'delete'];

    private const CHUNK = 100;
    private const MAX_IDS_PER_CALL = 500;
    private const TIME_BUDGET_SECONDS = 25;
    private const EXPORT_CAP = 20000;

    /**
     * POST /admin/users/bulk
     *
     * Corps : action (obligatoire) + SOIT ids[] (≤500, le front envoie des
     * lots de 100), SOIT filters{search,role,status} (mêmes filtres que
     * GET /admin/users). dry_run:true → aperçu chiffré sans rien modifier.
     * Pour delete réel : password + confirm_phrase (+ confirm_total en mode
     * ids, = total annoncé par le dry run).
     */
    public function bulkUsers(Request $request)
    {
        $validated = $request->validate([
            'action'          => 'required|string|in:' . implode(',', self::ACTIONS),
            'ids'             => 'nullable|array|max:' . self::MAX_IDS_PER_CALL,
            'ids.*'           => 'integer',
            'filters'         => 'nullable|array',
            'filters.search'  => 'nullable|string|max:255',
            'filters.role'    => 'nullable|string|in:client,hairdresser,salon_owner,admin',
            'filters.status'  => 'nullable|string|in:active,suspended',
            'dry_run'         => 'nullable|boolean',
            'password'        => 'nullable|string',
            'confirm_phrase'  => 'nullable|string|max:100',
            'confirm_total'   => 'nullable|integer|min:1',
        ]);

        $admin  = $request->user();
        $action = $validated['action'];
        $dryRun = (bool) ($validated['dry_run'] ?? false);
        $ids    = $validated['ids'] ?? null;
        $filters = $validated['filters'] ?? null;

        if (empty($ids) && $filters === null) {
            return response()->json(['message' => 'Fournissez ids[] ou filters{}.'], 422);
        }
        if (!empty($ids) && $filters !== null) {
            return response()->json(['message' => 'ids[] et filters{} sont exclusifs.'], 422);
        }

        if (!$admin->hasPermission(self::ACTION_PERMISSIONS[$action])) {
            return response()->json(['error' => 'Permission refusée', 'required' => self::ACTION_PERMISSIONS[$action]], 403);
        }

        // ─── Résolution du lot + exclusions serveur ─────────────────────────
        $query = $this->buildQuery($ids, $filters);
        $resolved = $query->orderBy('id')
            ->limit($action === 'export_csv' ? self::EXPORT_CAP : 100000)
            ->get(['id', 'name', 'email', 'role', 'admin_role_id', 'city', 'suspended_at', 'created_at']);

        $excludedAdminIds = [];
        $excludedSelf = false;
        $eligible = [];

        foreach ($resolved as $u) {
            if (in_array($action, self::DESTRUCTIVE, true)) {
                if ((int) $u->id === (int) $admin->id) {
                    $excludedSelf = true;
                    continue;
                }
                if ($u->role === 'admin' || $u->admin_role_id !== null) {
                    $excludedAdminIds[] = (int) $u->id;
                    continue;
                }
            }
            $eligible[] = $u;
        }

        // ─── Export CSV : lecture seule, pas d'exclusions ───────────────────
        if ($action === 'export_csv') {
            $rows = $resolved->map(fn ($u) => [
                'id'           => $u->id,
                'name'         => $u->name,
                'email'        => $u->email,
                'role'         => $u->role,
                'city'         => $u->city,
                'created_at'   => $u->created_at,
                'suspended_at' => $u->suspended_at,
            ])->values();

            if (!$dryRun) {
                // Un export de données personnelles se journalise aussi.
                AdminAuditLogger::log($admin, 'users.bulk_export_csv', 'user', null,
                    ['ids' => $ids, 'filters' => $filters],
                    ['exported' => $rows->count(), 'capped' => $resolved->count() >= self::EXPORT_CAP],
                    $request);
            }

            return response()->json(['action' => $action, 'rows' => $rows, 'total' => $rows->count()]);
        }

        // ─── Aperçu chiffré (dry run) ───────────────────────────────────────
        if ($dryRun) {
            return response()->json($this->dryRunPayload($action, $resolved->count(), $eligible, $excludedAdminIds, $excludedSelf));
        }

        // ─── Garde-fous delete (côté serveur, mission point 3) ──────────────
        if ($action === 'delete') {
            if (empty($validated['password']) || !Hash::check($validated['password'], $admin->password)) {
                return response()->json(['message' => 'Mot de passe admin invalide — la suppression en masse exige une réauthentification.'], 403);
            }

            // N de référence : en mode filters, le serveur vient de résoudre
            // le lot complet → N réel. En mode ids (lots de 100 envoyés par
            // le front), N = confirm_total annoncé par le dry run, et aucun
            // lot ne peut dépasser ce total.
            $deletable = array_values(array_filter($eligible, fn ($u) => !AccountDeletionService::isAlreadyAnonymized($u)));
            $n = $filters !== null ? count($deletable) : (int) ($validated['confirm_total'] ?? 0);
            $expected = 'SUPPRIMER ' . $n . ' COMPTES';

            if ($n < 1 || trim((string) ($validated['confirm_phrase'] ?? '')) !== $expected) {
                return response()->json([
                    'message' => 'Phrase de confirmation invalide. Saisissez exactement la phrase affichée dans l\'aperçu.',
                ], 422);
            }
            if ($filters === null && count($deletable) > $n) {
                return response()->json(['message' => 'Le lot dépasse le total confirmé — relancez l\'aperçu.'], 422);
            }
        }

        // ─── Exécution par chunks de 100 ────────────────────────────────────
        $startedAt = microtime(true);
        $succeeded = [];
        $skipped   = [];
        $failed    = [];
        $remaining = 0;
        $modes     = ['purged' => 0, 'anonymized' => 0];

        $chunks = array_chunk($eligible, self::CHUNK);
        foreach ($chunks as $chunkIndex => $chunk) {
            if ((microtime(true) - $startedAt) > self::TIME_BUDGET_SECONDS) {
                // Résultat partiel : le front relance avec le reste.
                for ($i = $chunkIndex; $i < count($chunks); $i++) {
                    $remaining += count($chunks[$i]);
                }
                break;
            }

            if (in_array($action, ['suspend', 'unsuspend', 'hide', 'unhide'], true)) {
                DB::transaction(function () use ($chunk, $action, &$succeeded, &$skipped, &$failed) {
                    foreach ($chunk as $u) {
                        try {
                            $result = $this->applySimpleAction($u, $action);
                            if ($result === 'ok') {
                                $succeeded[] = (int) $u->id;
                            } else {
                                $skipped[] = ['id' => (int) $u->id, 'reason' => $result];
                            }
                        } catch (\Throwable $e) {
                            $failed[] = ['id' => (int) $u->id, 'reason' => $e->getMessage()];
                        }
                    }
                });
            } else { // delete — chaque compte est déjà atomique (transaction interne)
                foreach ($chunk as $u) {
                    if ((microtime(true) - $startedAt) > self::TIME_BUDGET_SECONDS) {
                        $remaining++;
                        continue;
                    }
                    try {
                        if (AccountDeletionService::isAlreadyAnonymized($u)) {
                            $skipped[] = ['id' => (int) $u->id, 'reason' => 'deja_supprime'];
                        } elseif (AccountDeletionService::isDemoAccount($u)) {
                            AccountDeletionService::purgeDemo($u);
                            $modes['purged']++;
                            $succeeded[] = (int) $u->id;
                        } else {
                            AccountDeletionService::anonymize($u);
                            $modes['anonymized']++;
                            $succeeded[] = (int) $u->id;
                        }
                    } catch (\Throwable $e) {
                        $failed[] = ['id' => (int) $u->id, 'reason' => $e->getMessage()];
                    }
                }
            }
        }

        // ─── Journal d'audit (mission point 6) ──────────────────────────────
        AdminAuditLogger::log($admin, 'users.bulk_' . $action, 'user', null,
            [
                'ids'     => $ids,
                'filters' => $filters,
                'requested' => $resolved->count(),
            ],
            [
                'succeeded'          => count($succeeded),
                'succeeded_ids'      => $succeeded,
                'skipped'            => $skipped,
                'failed'             => $failed,
                'excluded_admin_ids' => $excludedAdminIds,
                'excluded_self'      => $excludedSelf,
                'remaining'          => $remaining,
                'modes'              => $action === 'delete' ? $modes : null,
            ],
            $request);

        return response()->json([
            'action'    => $action,
            'requested' => $resolved->count(),
            'succeeded' => count($succeeded),
            'succeeded_ids' => $succeeded,
            'skipped'   => $skipped,
            'failed'    => $failed,
            'excluded'  => ['admin_ids' => $excludedAdminIds, 'current_admin' => $excludedSelf],
            'remaining' => $remaining,
            'modes'     => $action === 'delete' ? $modes : null,
        ]);
    }

    /**
     * GET /admin/demo-data/analyze — photographie chiffrée des données de
     * démonstration AVANT purge. Critère unique et FIABLE : email se
     * terminant par @demo.getchair.app (vérifié en base le 25/08/2026 :
     * les comptes réels — Julien SCHILLINGER, Antoine KOEHLER, le compte
     * admin — sont hors motif). Signale aussi les contenus de comptes RÉELS
     * rattachés à des données démo (supprimés en cascade si la purge part).
     */
    public function analyzeDemoData(Request $request)
    {
        $suffix = AccountDeletionService::DEMO_EMAIL_SUFFIX;

        $demoUsers = User::where('email', 'like', '%' . $suffix)->get(['id', 'name', 'email', 'role', 'admin_role_id']);
        $demoUserIds = $demoUsers->pluck('id')->all();

        // Garde-fou : un compte admin qui matcherait le motif serait exclu de
        // la purge — signalé ici pour que ce soit visible avant d'appuyer.
        $adminInScope = $demoUsers->filter(fn ($u) => $u->role === 'admin' || $u->admin_role_id !== null)->pluck('id')->values();

        $demoProfileIds = DB::table('hairdresser_profiles')->whereIn('user_id', $demoUserIds)->pluck('id')->all();
        $demoSalonIds   = DB::table('salons')->whereIn('owner_id', $demoUserIds)->pluck('id')->all();

        $counts = [
            'users'                => count($demoUserIds),
            'users_by_role'        => $demoUsers->groupBy('role')->map->count(),
            'hairdresser_profiles' => count($demoProfileIds),
            'salons_owned'         => count($demoSalonIds),
            'appointments'         => DB::table('appointments')
                ->where(function ($q) use ($demoUserIds, $demoProfileIds) {
                    $q->whereIn('client_id', $demoUserIds);
                    if (!empty($demoProfileIds)) {
                        $q->orWhereIn('hairdresser_id', $demoProfileIds);
                    }
                })->count(),
            'reviews_by_demo_clients'   => DB::table('reviews')->whereIn('client_id', $demoUserIds)->count(),
            'reviews_on_demo_hairdressers' => empty($demoProfileIds) ? 0 : DB::table('reviews')->whereIn('hairdresser_id', $demoProfileIds)->count(),
            'posts'                => empty($demoProfileIds) ? 0 : DB::table('posts')->whereIn('hairdresser_id', $demoProfileIds)->count(),
            'job_offers'           => empty($demoSalonIds) ? 0 : DB::table('job_offers')->whereIn('salon_id', $demoSalonIds)->count(),
            'chair_rentals'        => empty($demoSalonIds) ? 0 : DB::table('chair_rentals')->whereIn('salon_id', $demoSalonIds)->count(),
        ];

        // Contenus de comptes RÉELS rattachés au périmètre démo — supprimés
        // ou détachés en cascade par la purge : à SIGNALER avant confirmation.
        $crossLinks = [
            // Avis d'un client réel sur un coiffeur démo → supprimé (cascade).
            'real_reviews_on_demo_hairdressers' => empty($demoProfileIds) ? 0 : DB::table('reviews')
                ->whereIn('hairdresser_id', $demoProfileIds)
                ->whereNotIn('client_id', $demoUserIds)
                ->count(),
            // RDV d'un client réel chez un coiffeur démo → supprimé (cascade).
            'real_appointments_with_demo_hairdressers' => empty($demoProfileIds) ? 0 : DB::table('appointments')
                ->whereIn('hairdresser_id', $demoProfileIds)
                ->where(function ($q) use ($demoUserIds) {
                    $q->whereNotIn('client_id', $demoUserIds)->orWhereNull('client_id');
                })->count(),
            // Coiffeur réel rattaché à un salon démo → détaché (SET NULL), pas supprimé.
            'real_hairdressers_in_demo_salons' => empty($demoSalonIds) ? 0 : DB::table('hairdresser_profiles')
                ->whereIn('salon_id', $demoSalonIds)
                ->whereNotIn('user_id', $demoUserIds)
                ->count(),
            // Utilisateur réel parrainé par un compte démo → lien effacé (SET NULL).
            'real_users_referred_by_demo' => DB::table('users')
                ->whereIn('referred_by_user_id', $demoUserIds)
                ->where('email', 'not like', '%' . $suffix)
                ->count(),
        ];

        $purgeable = count($demoUserIds) - $adminInScope->count();

        return response()->json([
            'suffix'          => $suffix,
            'counts'          => $counts,
            'cross_links'     => $crossLinks,
            'admin_in_scope_ids' => $adminInScope,
            'purgeable_count' => $purgeable,
            'confirm_phrase_expected' => 'SUPPRIMER ' . $purgeable . ' COMPTES',
            'sample'          => $demoUsers->take(10)->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role]),
            'generated_at'    => now()->toISOString(),
        ]);
    }

    /**
     * POST /admin/demo-data/purge — purge physique de TOUS les comptes
     * @demo.getchair.app (et rien d'autre : AccountDeletionService::purgeDemo
     * jette une exception sur tout compte hors motif — garde-fou final même
     * si la requête de sélection était corrompue). Même mécanique de
     * confirmation forte que le bulk delete : dry_run, mot de passe re-saisi,
     * phrase « SUPPRIMER N COMPTES » comparée au N réel recalculé ICI.
     */
    public function purgeDemoData(Request $request)
    {
        $validated = $request->validate([
            'dry_run'        => 'nullable|boolean',
            'password'       => 'nullable|string',
            'confirm_phrase' => 'nullable|string|max:100',
        ]);

        $admin = $request->user();
        $suffix = AccountDeletionService::DEMO_EMAIL_SUFFIX;

        $targets = User::where('email', 'like', '%' . $suffix)
            ->where('id', '!=', $admin->id)
            ->whereNull('admin_role_id')
            ->where('role', '!=', 'admin')
            ->orderBy('id')
            ->get();

        if ($validated['dry_run'] ?? false) {
            return $this->analyzeDemoData($request);
        }

        $n = $targets->count();
        if ($n === 0) {
            return response()->json(['message' => 'Aucune donnée de démonstration à purger.'], 422);
        }

        if (empty($validated['password']) || !Hash::check($validated['password'], $admin->password)) {
            return response()->json(['message' => 'Mot de passe admin invalide — la purge exige une réauthentification.'], 403);
        }

        $expected = 'SUPPRIMER ' . $n . ' COMPTES';
        if (trim((string) ($validated['confirm_phrase'] ?? '')) !== $expected) {
            return response()->json(['message' => 'Phrase de confirmation invalide. Relancez l\'analyse et saisissez exactement la phrase attendue.'], 422);
        }

        $startedAt = microtime(true);
        $succeeded = [];
        $failed = [];
        $remaining = 0;

        foreach ($targets as $u) {
            if ((microtime(true) - $startedAt) > self::TIME_BUDGET_SECONDS) {
                $remaining++;
                continue;
            }
            try {
                AccountDeletionService::purgeDemo($u);
                $succeeded[] = (int) $u->id;
            } catch (\Throwable $e) {
                $failed[] = ['id' => (int) $u->id, 'reason' => $e->getMessage()];
            }
        }

        AdminAuditLogger::log($admin, 'maintenance.demo_purge', 'user', null,
            ['targets' => $n, 'suffix' => $suffix],
            ['succeeded' => count($succeeded), 'succeeded_ids' => $succeeded, 'failed' => $failed, 'remaining' => $remaining],
            $request);

        return response()->json([
            'succeeded' => count($succeeded),
            'failed'    => $failed,
            'remaining' => $remaining,
        ]);
    }

    // ─── Privé ──────────────────────────────────────────────────────────────

    /** Même sémantique de filtres que AdminUserController::index — un seul contrat pour la liste ET le bulk. */
    private function buildQuery(?array $ids, ?array $filters)
    {
        $query = User::query();

        if (!empty($ids)) {
            return $query->whereIn('id', $ids);
        }

        if ($search = ($filters['search'] ?? null)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($role = ($filters['role'] ?? null)) {
            $query->where('role', $role);
        }
        if ($status = ($filters['status'] ?? null)) {
            if ($status === 'suspended') {
                $query->whereNotNull('suspended_at');
            } elseif ($status === 'active') {
                $query->whereNull('suspended_at');
            }
        }

        return $query;
    }

    /**
     * suspend/unsuspend : mêmes effets que AdminUserController::suspendUser /
     * unsuspendUser (assignation directe hors $fillable + révocation des
     * tokens à la suspension). hide/unhide : mêmes effets que
     * AdminHairdresserController::hide/unhide, appliqués au profil coiffeur
     * du compte — un compte sans profil est "skipped", pas "failed".
     *
     * @return string 'ok' ou une raison de skip.
     */
    private function applySimpleAction(User $u, string $action): string
    {
        if ($action === 'suspend') {
            if ($u->suspended_at) {
                return 'deja_suspendu';
            }
            $u->suspended_at = now();
            $u->save();
            $u->tokens()->delete();
            return 'ok';
        }

        if ($action === 'unsuspend') {
            if (!$u->suspended_at) {
                return 'deja_actif';
            }
            $u->suspended_at = null;
            $u->save();
            return 'ok';
        }

        // hide / unhide — sur le profil coiffeur du compte
        $profile = DB::table('hairdresser_profiles')->where('user_id', $u->id)->first(['id', 'is_hidden']);
        if (!$profile) {
            return 'pas_de_profil_coiffeur';
        }

        if ($action === 'hide') {
            if ($profile->is_hidden) {
                return 'deja_masque';
            }
            DB::table('hairdresser_profiles')->where('id', $profile->id)->update([
                'is_hidden'     => true,
                'hidden_reason' => 'Masqué par action groupée admin',
                'hidden_at'     => now(),
                'updated_at'    => now(),
            ]);
            return 'ok';
        }

        if (!$profile->is_hidden) {
            return 'deja_visible';
        }
        DB::table('hairdresser_profiles')->where('id', $profile->id)->update([
            'is_hidden'     => false,
            'hidden_reason' => null,
            'hidden_at'     => null,
            'updated_at'    => now(),
        ]);
        return 'ok';
    }

    /** Aperçu chiffré AVANT confirmation (mission point 5). */
    private function dryRunPayload(string $action, int $requested, array $eligible, array $excludedAdminIds, bool $excludedSelf): array
    {
        $eligibleIds = array_map(fn ($u) => (int) $u->id, $eligible);
        $deletable = $action === 'delete'
            ? array_values(array_filter($eligible, fn ($u) => !AccountDeletionService::isAlreadyAnonymized($u)))
            : $eligible;
        $deletableIds = array_map(fn ($u) => (int) $u->id, $deletable);

        $profileIds = empty($deletableIds) ? [] : DB::table('hairdresser_profiles')->whereIn('user_id', $deletableIds)->pluck('id')->all();

        $impact = [
            'users'                => count($deletableIds),
            'hairdresser_profiles' => count($profileIds),
            'appointments'         => empty($deletableIds) ? 0 : DB::table('appointments')
                ->where(function ($q) use ($deletableIds, $profileIds) {
                    $q->whereIn('client_id', $deletableIds);
                    if (!empty($profileIds)) {
                        $q->orWhereIn('hairdresser_id', $profileIds);
                    }
                })->count(),
            'reviews'              => empty($deletableIds) ? 0 : DB::table('reviews')
                ->where(function ($q) use ($deletableIds, $profileIds) {
                    $q->whereIn('client_id', $deletableIds);
                    if (!empty($profileIds)) {
                        $q->orWhereIn('hairdresser_id', $profileIds);
                    }
                })->count(),
            'posts'                => empty($profileIds) ? 0 : DB::table('posts')->whereIn('hairdresser_id', $profileIds)->count(),
            'salons_owned'         => empty($deletableIds) ? 0 : DB::table('salons')->whereIn('owner_id', $deletableIds)->count(),
        ];

        $modes = null;
        if ($action === 'delete') {
            $purge = count(array_filter($deletable, fn ($u) => AccountDeletionService::isDemoAccount($u)));
            $modes = ['purge' => $purge, 'anonymize' => count($deletable) - $purge];
        }

        return [
            'dry_run'        => true,
            'action'         => $action,
            'requested'      => $requested,
            'eligible_count' => count($deletableIds),
            'eligible_ids'   => $deletableIds,
            'excluded'       => [
                'admin_ids'     => $excludedAdminIds,
                'current_admin' => $excludedSelf,
                'already_deleted' => count($eligibleIds) - count($deletableIds),
            ],
            'impact'         => $impact,
            'modes'          => $modes,
            'confirm_phrase_expected' => $action === 'delete' ? 'SUPPRIMER ' . count($deletableIds) . ' COMPTES' : null,
        ];
    }
}
