<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOffer;
use App\Models\Salon;
use Illuminate\Http\Request;

class JobOfferController extends Controller
{
    /** GET /job-offers — liste publique des offres ouvertes */
    public function index(Request $request)
    {
        $query = JobOffer::with(['salon'])
            ->where('status', 'open');

        if ($request->city) {
            $query->where('city', 'LIKE', '%' . $request->city . '%');
        }
        if ($request->job_type) {
            $query->where('job_type', $request->job_type);
        }
        if ($request->contract_type) {
            $query->where('contract_type', $request->contract_type);
        }

        return response()->json($query->latest()->paginate(20));
    }

    /** GET /my-job-offers — offres du salon connecté */
    public function mySalonOffers(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        return response()->json(JobOffer::where('salon_id', $salon->id)->latest()->get());
    }

    /** POST /job-offers — créer une offre (salon_owner) */
    public function store(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'title'         => 'required|string|max:255',
            'job_type'      => 'required|in:hairdresser,colorist,barber,stylist,apprentice,other',
            'level'         => 'nullable|in:cap1,cap2,bp1,bp2,bm_bts1,bm_bts2',
            'contract_type' => 'required|in:cdi,cdd,alternance,apprentissage,freelance',
            'description'   => 'nullable|string|max:2000',
            'city'          => 'nullable|string|max:100',
        ]);

        $offer = JobOffer::create(array_merge($validated, ['salon_id' => $salon->id, 'status' => 'open']));

        return response()->json($offer->load('salon'), 201);
    }

    /** PUT /job-offers/{id} */
    public function update(Request $request, int $id)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $offer = JobOffer::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $validated = $request->validate([
            'title'         => 'nullable|string|max:255',
            'job_type'      => 'nullable|in:hairdresser,colorist,barber,stylist,apprentice,other',
            'level'         => 'nullable|in:cap1,cap2,bp1,bp2,bm_bts1,bm_bts2',
            'contract_type' => 'nullable|in:cdi,cdd,alternance,apprentissage,freelance',
            'description'   => 'nullable|string|max:2000',
            'city'          => 'nullable|string|max:100',
            'status'        => 'nullable|in:open,closed',
        ]);

        $offer->update($validated);
        return response()->json($offer->fresh());
    }

    /** DELETE /job-offers/{id} */
    public function destroy(Request $request, int $id)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        JobOffer::where('id', $id)->where('salon_id', $salon->id)->firstOrFail()->delete();
        return response()->json(['message' => 'Offre supprimée.']);
    }
}
