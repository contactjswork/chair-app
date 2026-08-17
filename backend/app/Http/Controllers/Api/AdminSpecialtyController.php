<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Specialty;
use App\Services\AdminAuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * CRUD admin des spécialités (table 'specialties', déjà utilisée en lecture
 * par SpecialtyController, HairdresserController, RecommendationService,
 * SpecialtyReputationService...). Gardé par 'admin.auth' +
 * 'specialties.manage' sur toutes les routes (voir routes/api.php).
 *
 * RISQUE DE CASSE documenté : une spécialité supprimée en dur casserait
 * silencieusement toute ligne qui la référence (services.specialty_id,
 * reviews.specialty_id, verified_visits.specialty_id, qr_tokens.specialty_id,
 * post_tags, hairdresser_specialty_progress, hairdresser_specialties) —
 * toutes ces FK sont en nullOnDelete/cascade selon la table, donc un delete
 * ne plante pas en base, mais un profil coiffeur perdrait silencieusement sa
 * spécialité, un post perdrait son tag, etc. destroy() refuse donc la
 * suppression tant qu'UNE SEULE dépendance existe et propose le masquage
 * (is_active=false) à la place — c'est la seule action réellement sûre une
 * fois qu'une spécialité a été utilisée par un profil/service/avis réel.
 *
 * slug volontairement IMMUABLE après création (update() l'ignore) :
 * RecommendationService::HOMME_SLUGS/FEMME_SLUGS et
 * frontend/lib/homeFilters.ts codent en dur une liste de slugs existants
 * (voir rapport d'architecture, partie duplication non encore migrée vers
 * app_settings) — renommer un slug depuis l'admin casserait ce filtrage
 * homme/femme sans qu'aucune erreur ne remonte nulle part. Le nom affiché
 * (title), l'icône, la description restent librement éditables.
 */
class AdminSpecialtyController extends Controller
{
    /** GET /admin/specialties — liste complète (actives + masquées), avec compteurs d'usage. */
    public function index()
    {
        $specialties = Specialty::orderBy('order')->orderBy('name')->get();

        $data = $specialties->map(function (Specialty $s) {
            $arr = $s->toArray();
            $arr['usage'] = $this->usageCounts($s);
            $arr['usage_total'] = array_sum($arr['usage']);
            return $arr;
        });

        return response()->json(['data' => $data]);
    }

    /** POST /admin/specialties */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'slug'        => ['nullable', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', 'unique:specialties,slug'],
            'icon'        => ['nullable', 'string', 'max:100'],
            'category'    => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active'   => ['sometimes', 'boolean'],
            'order'       => ['sometimes', 'integer', 'min:0'],
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        if (Specialty::where('slug', $data['slug'])->exists()) {
            return response()->json(['error' => "Ce slug existe déjà, choisissez-en un autre."], 422);
        }

        $data['is_active'] = $data['is_active'] ?? true;
        $data['order']     = $data['order'] ?? ((int) (Specialty::max('order') ?? 0) + 10);

        $specialty = Specialty::create($data);

        AdminAuditLogger::log($request->user(), 'specialties.create', 'specialty', $specialty->id, null, $specialty->toArray(), $request);

        return response()->json($specialty, 201);
    }

    /** PATCH /admin/specialties/{id} — slug volontairement non modifiable, voir docblock. */
    public function update(Request $request, $id)
    {
        $specialty = Specialty::findOrFail($id);

        $data = $request->validate([
            'name'        => ['sometimes', 'required', 'string', 'max:100'],
            'icon'        => ['sometimes', 'nullable', 'string', 'max:100'],
            'category'    => ['sometimes', 'nullable', 'string', 'max:60'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'order'       => ['sometimes', 'integer', 'min:0'],
        ]);

        $old = $specialty->toArray();
        $specialty->update($data);

        AdminAuditLogger::log($request->user(), 'specialties.update', 'specialty', $specialty->id, $old, $specialty->fresh()->toArray(), $request);

        return response()->json($specialty->fresh());
    }

    public function hide(Request $request, $id)
    {
        $specialty = Specialty::findOrFail($id);
        $old = $specialty->is_active;
        $specialty->update(['is_active' => false]);

        AdminAuditLogger::log($request->user(), 'specialties.hide', 'specialty', $specialty->id, ['is_active' => $old], ['is_active' => false], $request);

        return response()->json(['ok' => true]);
    }

    public function unhide(Request $request, $id)
    {
        $specialty = Specialty::findOrFail($id);
        $old = $specialty->is_active;
        $specialty->update(['is_active' => true]);

        AdminAuditLogger::log($request->user(), 'specialties.unhide', 'specialty', $specialty->id, ['is_active' => $old], ['is_active' => true], $request);

        return response()->json(['ok' => true]);
    }

    /**
     * DELETE /admin/specialties/{id} — refuse tant qu'une seule dépendance
     * réelle existe (voir docblock de classe) : 422 avec le détail des
     * compteurs d'usage, jamais un delete silencieux qui casserait des
     * profils/services/avis existants.
     */
    public function destroy(Request $request, $id)
    {
        $specialty = Specialty::findOrFail($id);
        $usage = $this->usageCounts($specialty);
        $total = array_sum($usage);

        if ($total > 0) {
            return response()->json([
                'error'      => "Impossible de supprimer : cette spécialité est encore utilisée par des profils, services ou avis existants. Masquez-la à la place (elle disparaît des listes publiques sans rien casser).",
                'usage'      => $usage,
                'suggestion' => 'hide',
            ], 422);
        }

        $old = $specialty->toArray();
        $specialty->delete();

        AdminAuditLogger::log($request->user(), 'specialties.delete', 'specialty', $id, $old, null, $request);

        return response()->json(['ok' => true]);
    }

    /** POST /admin/specialties/reorder — {order: [{id, order}, ...]}. */
    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order'         => 'required|array|min:1',
            'order.*.id'    => 'required|integer|exists:specialties,id',
            'order.*.order' => 'required|integer|min:0',
        ]);

        foreach ($data['order'] as $item) {
            Specialty::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        AdminAuditLogger::log($request->user(), 'specialties.reorder', 'specialty', null, null, $data['order'], $request);

        return response()->json(['ok' => true]);
    }

    /** Toutes les tables qui référencent cette spécialité — voir docblock de classe pour la liste et pourquoi. */
    private function usageCounts(Specialty $specialty): array
    {
        return [
            'hairdressers'       => DB::table('hairdresser_specialties')->where('specialty_id', $specialty->id)->count(),
            'services'           => DB::table('services')->where('specialty_id', $specialty->id)->count(),
            'reviews'            => DB::table('reviews')->where('specialty_id', $specialty->id)->count(),
            'verified_visits'    => DB::table('verified_visits')->where('specialty_id', $specialty->id)->count(),
            'qr_tokens'          => DB::table('qr_tokens')->where('specialty_id', $specialty->id)->count(),
            'posts'              => DB::table('post_tags')->where('specialty_id', $specialty->id)->count(),
            'specialty_progress' => DB::table('hairdresser_specialty_progress')->where('specialty_id', $specialty->id)->count(),
        ];
    }
}
