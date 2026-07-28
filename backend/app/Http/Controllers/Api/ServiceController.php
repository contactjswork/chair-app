<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Services\SpecialtyReputationService;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    // ─── PUBLIC ─────────────────────────────────────────────────────────────

    /**
     * GET /api/hairdressers/{slug}/services
     * Retourne les catégories avec leurs services actifs pour un coiffeur.
     */
    public function publicList(Request $request, string $slug)
    {
        $profile = \App\Models\HairdresserProfile::where('slug', $slug)->firstOrFail();

        $categories = ServiceCategory::where('hairdresser_id', $profile->id)
            ->with(['services' => function ($q) {
                $q->where('is_active', true)->orderBy('name')->with('specialty');
            }])
            ->orderBy('display_order')
            ->get();

        return response()->json($categories);
    }

    // ─── PROTECTED ───────────────────────────────────────────────────────────

    private function getProfile(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) abort(403, 'Profil coiffeur introuvable');
        return $profile;
    }

    // Categories CRUD

    public function indexCategories(Request $request)
    {
        $profile = $this->getProfile($request);
        $categories = ServiceCategory::where('hairdresser_id', $profile->id)
            ->with(['allServices'])
            ->orderBy('display_order')
            ->get();
        return response()->json($categories);
    }

    public function storeCategory(Request $request)
    {
        $profile = $this->getProfile($request);
        $validated = $request->validate([
            'name'          => 'required|string|max:100',
            'description'   => 'nullable|string|max:500',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $maxOrder = ServiceCategory::where('hairdresser_id', $profile->id)->max('display_order') ?? -1;

        $category = ServiceCategory::create([
            'hairdresser_id' => $profile->id,
            'name'           => $validated['name'],
            'description'    => $validated['description'] ?? null,
            'display_order'  => $validated['display_order'] ?? $maxOrder + 1,
        ]);

        return response()->json($category->load('allServices'), 201);
    }

    public function updateCategory(Request $request, int $id)
    {
        $profile  = $this->getProfile($request);
        $category = ServiceCategory::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'description'   => 'nullable|string|max:500',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $category->update($validated);
        return response()->json($category->load('allServices'));
    }

    public function destroyCategory(Request $request, int $id)
    {
        $profile  = $this->getProfile($request);
        $category = ServiceCategory::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();

        // La FK services.category_id est ON DELETE CASCADE : supprimer la
        // catégorie supprime définitivement tous ses services en base, sans
        // égard aux rendez-vous liés (voir aussi permanentlyDestroyService).
        // On bloque donc ici au même titre qu'une suppression de service.
        $serviceIds = Service::where('category_id', $id)->pluck('id');
        $appointmentsCount = $serviceIds->isEmpty() ? 0 : Appointment::whereIn('service_id', $serviceIds)->count();
        if ($appointmentsCount > 0) {
            return response()->json([
                'message' => "Cette catégorie contient des services liés à {$appointmentsCount} rendez-vous — désactivez-les individuellement plutôt que de supprimer la catégorie.",
                'appointments_count' => $appointmentsCount,
            ], 409);
        }

        $category->delete();
        return response()->json(null, 204);
    }

    // Services CRUD

    public function indexServices(Request $request)
    {
        $profile  = $this->getProfile($request);
        $services = Service::where('hairdresser_id', $profile->id)
            ->with(['category', 'specialty'])
            ->orderBy('category_id')
            ->orderBy('name')
            ->get();
        return response()->json($services);
    }

    public function storeService(Request $request)
    {
        $profile = $this->getProfile($request);

        $validated = $request->validate([
            'category_id'      => 'required|integer|exists:service_categories,id',
            'specialty_id'      => 'nullable|integer|exists:specialties,id',
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string|max:500',
            'price'            => 'nullable|numeric|min:0|max:9999.99',
            'duration_minutes' => 'nullable|integer|min:5|max:480',
        ]);

        // Vérifier que la catégorie appartient bien à ce coiffeur
        $category = ServiceCategory::where('id', $validated['category_id'])
            ->where('hairdresser_id', $profile->id)
            ->firstOrFail();

        $service = Service::create(array_merge($validated, [
            'hairdresser_id' => $profile->id,
        ]));

        return response()->json($service->fresh(['category', 'specialty']), 201);
    }

    public function updateService(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $service = Service::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();

        $validated = $request->validate([
            'category_id'      => 'sometimes|integer|exists:service_categories,id',
            'specialty_id'      => 'nullable|integer|exists:specialties,id',
            'name'             => 'sometimes|string|max:150',
            'description'      => 'nullable|string|max:500',
            'price'            => 'sometimes|numeric|min:0|max:9999.99',
            'duration_minutes' => 'sometimes|integer|min:5|max:480',
            'is_active'        => 'sometimes|boolean',
        ]);

        $specialtyChanged = array_key_exists('specialty_id', $validated) && $validated['specialty_id'] !== $service->specialty_id;

        $service->update($validated);

        // Un service déplacé vers une autre spécialité change la spécialité
        // à laquelle ses rendez-vous complétés contribuent (SpecialtyReputationService
        // rejoint appointments.service_id -> services.specialty_id en direct,
        // voir docs) — on recalcule tout de suite plutôt que d'attendre le
        // prochain déclencheur naturel.
        if ($specialtyChanged) {
            SpecialtyReputationService::refreshAll($profile);
        }

        return response()->json($service->load(['category', 'specialty']));
    }

    /** Désactive un service (visible dans la gestion, plus proposé à la réservation). Réversible. */
    public function destroyService(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $service = Service::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();
        $service->update(['is_active' => false]);
        return response()->json($service);
    }

    /**
     * Duplique un service à l'identique (nom, prix, durée, description,
     * catégorie, spécialité) sous le même nom suffixé " (copie)". Le
     * duplicata démarre actif et sans aucun rendez-vous/statistique associé.
     */
    public function duplicateService(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $service = Service::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();

        $copy = Service::create([
            'hairdresser_id'   => $profile->id,
            'category_id'      => $service->category_id,
            'specialty_id'     => $service->specialty_id,
            'name'             => "{$service->name} (copie)",
            'description'      => $service->description,
            'price'            => $service->price,
            'duration_minutes' => $service->duration_minutes,
            'is_active'        => true,
        ]);

        return response()->json($copy->fresh(['category', 'specialty']), 201);
    }

    /**
     * Suppression DÉFINITIVE — supprime réellement la ligne, contrairement à
     * destroyService() qui ne fait que désactiver. Bloquée dès que le moindre
     * rendez-vous (passé ou futur, quel que soit son statut) référence ce
     * service : la FK appointments.service_id est ON DELETE SET NULL, donc
     * techniquement la suppression "réussirait" sans casser la réservation,
     * mais on perdrait silencieusement l'attribution de ce rendez-vous aux
     * statistiques de la spécialité (SpecialtyReputationService fait un join
     * live sur service_id) — jamais de perte de données silencieuse. Un
     * service avec historique doit être désactivé, pas supprimé.
     */
    public function permanentlyDestroyService(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $service = Service::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();

        $appointmentsCount = Appointment::where('service_id', $id)->count();
        if ($appointmentsCount > 0) {
            return response()->json([
                'message' => "Ce service est lié à {$appointmentsCount} rendez-vous (passés ou à venir) — désactivez-le plutôt que de le supprimer, pour ne pas perdre l'historique.",
                'appointments_count' => $appointmentsCount,
            ], 409);
        }

        $service->delete();
        return response()->json(null, 204);
    }
}
