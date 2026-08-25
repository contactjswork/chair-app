<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Post;
use App\Models\Report;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Signalement de contenu par un utilisateur — exigence App Store Review
 * Guideline 1.2 (UGC) : "A mechanism to report offensive content and timely
 * responses to concerns".
 *
 * La table 'reports' et la file de modération admin (GET /admin/reports,
 * POST /admin/reports/{id}/ignore, POST /admin/reports/{id}/delete-content)
 * existaient déjà : il manquait uniquement le point d'entrée UTILISATEUR qui
 * alimente cette table. Ce contrôleur ne change donc rien côté admin, il
 * écrit exactement le contrat que l'admin lit déjà.
 *
 * Vocabulaire 'type' : on reste sur celui de l'existant ('post' | 'review' |
 * 'user') parce que app/admin/signalements/page.tsx (TypeBadge) et
 * AdminController::deleteReportContent sont déjà câblés dessus. Le client
 * peut envoyer 'profile' — plus parlant pour une fiche coiffeur — c'est
 * normalisé en 'user' ici.
 *
 * 'reason' est stocké en clair en français : c'est la valeur affichée telle
 * quelle au modérateur dans la file admin (colonne "Motif").
 */
class ReportController extends Controller
{
    /** Motifs acceptés (slug API → libellé stocké et affiché à l'admin). */
    private const REASONS = [
        'inappropriate'        => 'Contenu inapproprié',
        'harassment'           => 'Harcèlement',
        'spam'                 => 'Spam',
        'misleading'           => 'Contenu trompeur',
        'intellectual_property' => 'Propriété intellectuelle',
        'other'                => 'Autre',
    ];

    /**
     * POST /reports
     *
     * Corps : type (post|review|profile|user), content_id, reason, details?
     * content_id désigne : l'id du post, l'id de l'avis, ou l'id du PROFIL
     * coiffeur (hairdresser_profiles.id) pour un signalement de profil.
     *
     * reported_user_id n'est JAMAIS accepté depuis le client : il est résolu
     * côté serveur depuis le contenu signalé (sinon n'importe qui pourrait
     * salir la fiche de modération d'un tiers).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'       => ['required', Rule::in(['post', 'review', 'profile', 'user'])],
            'content_id' => ['required', 'integer', 'min:1'],
            'reason'     => ['required', Rule::in(array_keys(self::REASONS))],
            'details'    => ['nullable', 'string', 'max:1000'],
        ], [
            'type.required'       => 'Type de contenu manquant.',
            'type.in'             => 'Type de contenu invalide.',
            'content_id.required' => 'Contenu à signaler manquant.',
            'reason.required'     => 'Merci de choisir un motif.',
            'reason.in'           => 'Motif invalide.',
            'details.max'         => 'Les détails ne peuvent pas dépasser 1000 caractères.',
        ]);

        $type      = $validated['type'] === 'profile' ? 'user' : $validated['type'];
        $contentId = (int) $validated['content_id'];
        $reporter  = $request->user();

        // ── Le contenu signalé doit exister réellement ────────────────────
        $reportedUserId = $this->resolveReportedUserId($type, $contentId);
        if ($reportedUserId === false) {
            return response()->json(['message' => "Ce contenu n'existe plus."], 404);
        }

        // On ne se signale pas soi-même : c'est du bruit dans la file de modération.
        if ($reportedUserId !== null && (int) $reportedUserId === (int) $reporter->id) {
            return response()->json(['message' => 'Vous ne pouvez pas signaler votre propre contenu.'], 422);
        }

        // ── Anti-doublon : même signaleur, même contenu, pas encore traité ─
        // La table reports n'a pas de contrainte unique (un même contenu doit
        // pouvoir être signalé par PLUSIEURS utilisateurs, et re-signalé après
        // résolution) : le garde-fou est donc un check-then-insert, vulnérable
        // au double-tap. On le sérialise par un verrou nommé MySQL propre au
        // triplet (signaleur, type, contenu) — les signalements d'autres
        // utilisateurs ou d'autres contenus ne s'attendent jamais entre eux.
        $lockName = sprintf('chair:report:%d:%s:%d', $reporter->id, $type, $contentId);
        $got = \Illuminate\Support\Facades\DB::selectOne('SELECT GET_LOCK(?, 3) AS l', [$lockName]);
        if (!$got || (int) $got->l !== 1) {
            // L'autre requête du double-tap tient le verrou depuis > 3 s :
            // cas pathologique, on répond comme un doublon plutôt qu'un 500.
            return response()->json([
                'message'   => 'Vous avez déjà signalé ce contenu. Notre équipe l\'examine.',
                'duplicate' => true,
            ], 409);
        }

        try {
            $existing = Report::where('reporter_id', $reporter->id)
                ->where('type', $type)
                ->where('content_id', $contentId)
                ->whereNull('resolved_at')
                ->first();

            if ($existing) {
                return response()->json([
                    'message'   => 'Vous avez déjà signalé ce contenu. Notre équipe l\'examine.',
                    'report_id' => $existing->id,
                    'duplicate' => true,
                ], 409);
            }

            $report = Report::create([
                'type'             => $type,
                'content_id'       => $contentId,
                'reported_user_id' => $reportedUserId,
                'reporter_id'      => $reporter->id,
                'reason'           => self::REASONS[$validated['reason']],
                'details'          => $validated['details'] ?? null,
            ]);
        } finally {
            \Illuminate\Support\Facades\DB::selectOne('SELECT RELEASE_LOCK(?) AS r', [$lockName]);
        }

        return response()->json([
            'message'   => 'Merci, votre signalement a été transmis à notre équipe.',
            'report_id' => $report->id,
        ], 201);
    }

    /**
     * Résout l'auteur du contenu signalé.
     *
     * @return int|null|false  id utilisateur, null si inconnu, false si le
     *                         contenu n'existe pas (→ 404).
     */
    private function resolveReportedUserId(string $type, int $contentId)
    {
        if ($type === 'post') {
            $post = Post::with('hairdresser')->find($contentId);
            if (!$post) return false;
            return $post->hairdresser->user_id ?? null;
        }

        if ($type === 'review') {
            $review = Review::find($contentId);
            if (!$review) return false;
            // L'auteur d'un avis est le client qui l'a écrit — c'est lui que
            // le modérateur doit pouvoir suspendre, pas le coiffeur noté.
            return $review->client_id;
        }

        // type 'user' : content_id = id du profil coiffeur (fiche publique).
        $profile = HairdresserProfile::find($contentId);
        if (!$profile) return false;
        return $profile->user_id;
    }
}
