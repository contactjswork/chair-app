<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Services\AdminAuditLogger;
use App\Services\BadgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * CRUD admin du catalogue de badges (table 'badges', voir migration
 * 2026_08_17_140000 et App\Services\BadgeService pour le moteur qui la
 * consomme). Gardé par 'admin.auth' + 'badges.manage' sur toutes les routes
 * (voir routes/api.php).
 *
 * Un admin peut créer / modifier un badge GÉNÉRIQUE (criteria =
 * {metric, operator, value} pris dans BadgeService::METRICS /
 * ::OPERATORS) sans toucher au code. Il ne peut PAS créer de badge à
 * logique dédiée (combinaison de critères, classement relatif) — ceux-là
 * (BadgeService::HARDCODED_SLUGS) restent écrits en dur dans
 * BadgeService::hardcodedUnlocked(), l'admin ne peut éditer que leur
 * métadonnée (titre, description, icône, points, rareté, visibilité...),
 * jamais leur règle de déblocage.
 *
 * Pas de destroy() : la mission demande "désactiver", pas supprimer — un
 * badge déjà attribué à un utilisateur (hairdresser_badges.badge_code)
 * doit toujours pouvoir être affiché/retrouvé même si on l'enlève du
 * catalogue actif. 'enabled' = false le retire des nouvelles attributions
 * sans rien perdre.
 */
class AdminBadgeController extends Controller
{
    private function rarityRule()
    {
        return Rule::in(['commun', 'rare', 'epique', 'legendaire', 'ultime']);
    }

    private function familyRule()
    {
        return Rule::in(['carriere', 'exceptionnel']);
    }

    /** GET /admin/badges — catalogue complet + nombre de coiffeurs l'ayant débloqué. */
    public function index()
    {
        $badges = Badge::orderBy('order')->orderBy('id')->get();

        $awardedCounts = DB::table('hairdresser_badges')
            ->select('badge_code', DB::raw('count(*) as c'))
            ->groupBy('badge_code')
            ->pluck('c', 'badge_code');

        $data = $badges->map(function (Badge $b) use ($awardedCounts) {
            $arr = $b->toArray();
            $arr['is_generic']    = $b->criteria !== null;
            $arr['is_hardcoded']  = in_array($b->slug, BadgeService::HARDCODED_SLUGS, true);
            $arr['awarded_count'] = (int) ($awardedCounts[$b->slug] ?? 0);
            return $arr;
        });

        return response()->json([
            'data'      => $data,
            'metrics'   => BadgeService::METRICS,
            'operators' => BadgeService::OPERATORS,
        ]);
    }

    /** POST /admin/badges — crée un nouveau badge GÉNÉRIQUE (criteria obligatoire). */
    public function store(Request $request)
    {
        $data = $request->validate([
            'slug'              => ['required', 'string', 'max:60', 'regex:/^[a-z0-9_]+$/', 'unique:badges,slug'],
            'title'             => ['required', 'string', 'max:120'],
            'description'       => ['nullable', 'string', 'max:500'],
            'icon'              => ['nullable', 'string', 'max:100'],
            'category'          => ['nullable', 'string', 'max:60'],
            'family'            => ['required', $this->familyRule()],
            'rarity'            => ['required', $this->rarityRule()],
            'tier'              => ['required', 'integer', 'min:1', 'max:5'],
            'reward'            => ['required', 'integer', 'min:0'],
            'criteria'          => ['required', 'array'],
            'criteria.metric'   => ['required', Rule::in(BadgeService::METRICS)],
            'criteria.operator' => ['required', Rule::in(BadgeService::OPERATORS)],
            'criteria.value'    => ['required', 'numeric'],
            'roles'             => ['nullable', 'array'],
            'roles.*'           => [Rule::in(['independent', 'salaried'])],
            'visible'           => ['sometimes', 'boolean'],
            'enabled'           => ['sometimes', 'boolean'],
            'order'             => ['sometimes', 'integer', 'min:0'],
        ]);

        // Un nouveau badge ne peut jamais réutiliser un slug réservé à une
        // logique dédiée dans le code (au cas où il aurait été retiré de la
        // table par erreur) — évite qu'un badge "portfolio_10" administrable
        // masque silencieusement un futur badge dédié du même nom.
        if (in_array($data['slug'], BadgeService::HARDCODED_SLUGS, true)) {
            return response()->json(['error' => "Ce slug est réservé à un badge à logique dédiée dans le code — impossible de le créer depuis l'admin."], 422);
        }

        $data['visible'] = $data['visible'] ?? true;
        $data['enabled'] = $data['enabled'] ?? true;
        $data['order']   = $data['order'] ?? ((int) (Badge::max('order') ?? 0) + 10);

        $badge = Badge::create($data);
        BadgeService::clearCatalogCache();

        AdminAuditLogger::log($request->user(), 'badges.create', 'badge', $badge->slug, null, $badge->toArray(), $request);

        return response()->json($badge, 201);
    }

    /** PATCH /admin/badges/{id} — édite la métadonnée (+ criteria si le badge n'est pas à logique dédiée). */
    public function update(Request $request, $id)
    {
        $badge = Badge::findOrFail($id);
        $isHardcoded = in_array($badge->slug, BadgeService::HARDCODED_SLUGS, true);

        $rules = [
            'title'       => ['sometimes', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'icon'        => ['sometimes', 'nullable', 'string', 'max:100'],
            'category'    => ['sometimes', 'nullable', 'string', 'max:60'],
            'family'      => ['sometimes', $this->familyRule()],
            'rarity'      => ['sometimes', $this->rarityRule()],
            'tier'        => ['sometimes', 'integer', 'min:1', 'max:5'],
            'reward'      => ['sometimes', 'integer', 'min:0'],
            'roles'       => ['sometimes', 'nullable', 'array'],
            'roles.*'     => [Rule::in(['independent', 'salaried'])],
            'visible'     => ['sometimes', 'boolean'],
            'enabled'     => ['sometimes', 'boolean'],
            'order'       => ['sometimes', 'integer', 'min:0'],
        ];

        if (!$isHardcoded) {
            $rules['criteria']          = ['sometimes', 'array'];
            $rules['criteria.metric']   = ['required_with:criteria', Rule::in(BadgeService::METRICS)];
            $rules['criteria.operator'] = ['required_with:criteria', Rule::in(BadgeService::OPERATORS)];
            $rules['criteria.value']    = ['required_with:criteria', 'numeric'];
        }

        $data = $request->validate($rules);

        // Un badge à logique dédiée ne peut jamais recevoir de criteria : le
        // moteur générique l'ignorerait purement et simplement (voir
        // BadgeService::isBadgeUnlocked), mieux vaut un refus explicite
        // qu'un admin qui croit avoir changé une règle qui ne bouge pas.
        if ($isHardcoded && $request->has('criteria')) {
            return response()->json(['error' => "Ce badge utilise une logique dédiée dans BadgeService (combinaison de critères ou classement relatif) — sa règle de déblocage ne peut pas être remplacée par le moteur générique depuis l'admin."], 422);
        }

        // slug immuable : hairdresser_badges.badge_code le référence par
        // valeur (pas de FK) pour tout l'historique déjà attribué — le
        // renommer casserait silencieusement ce lien.
        unset($data['slug']);

        $old = $badge->toArray();
        $badge->update($data);
        BadgeService::clearCatalogCache();

        AdminAuditLogger::log($request->user(), 'badges.update', 'badge', $badge->slug, $old, $badge->fresh()->toArray(), $request);

        return response()->json($badge->fresh());
    }

    /** POST /admin/badges/reorder — {order: [{id, order}, ...]}. */
    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order'          => 'required|array|min:1',
            'order.*.id'     => 'required|integer|exists:badges,id',
            'order.*.order'  => 'required|integer|min:0',
        ]);

        foreach ($data['order'] as $item) {
            Badge::where('id', $item['id'])->update(['order' => $item['order']]);
        }
        BadgeService::clearCatalogCache();

        AdminAuditLogger::log($request->user(), 'badges.reorder', 'badge', null, null, $data['order'], $request);

        return response()->json(['ok' => true]);
    }
}
