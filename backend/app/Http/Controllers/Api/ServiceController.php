<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceCategory;
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
                $q->where('is_active', true)->orderBy('name');
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
        $category->delete();
        return response()->json(null, 204);
    }

    // Services CRUD

    public function indexServices(Request $request)
    {
        $profile  = $this->getProfile($request);
        $services = Service::where('hairdresser_id', $profile->id)
            ->with('category')
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

        return response()->json($service->load('category'), 201);
    }

    public function updateService(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $service = Service::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();

        $validated = $request->validate([
            'category_id'      => 'sometimes|integer|exists:service_categories,id',
            'name'             => 'sometimes|string|max:150',
            'description'      => 'nullable|string|max:500',
            'price'            => 'sometimes|numeric|min:0|max:9999.99',
            'duration_minutes' => 'sometimes|integer|min:5|max:480',
            'is_active'        => 'sometimes|boolean',
        ]);

        $service->update($validated);
        return response()->json($service->load('category'));
    }

    public function destroyService(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $service = Service::where('id', $id)->where('hairdresser_id', $profile->id)->firstOrFail();
        $service->update(['is_active' => false]);
        return response()->json($service);
    }
}
