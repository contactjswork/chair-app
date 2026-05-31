<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class HairdresserController extends Controller
{
    public function index(Request $request)
    {
        $hairdressers = \App\Models\HairdresserProfile::with(['user', 'specialties', 'salon'])
            ->when($request->city, fn($q) => $q->where('city', 'like', '%' . $request->city . '%'))
            ->when($request->specialty, fn($q) => $q->whereHas('specialties', fn($sq) =>
                $sq->where('slug', $request->specialty)
            ))
            ->orderByDesc('avg_rating')
            ->paginate(20);

        return response()->json($hairdressers);
    }

    public function show(string $slug)
    {
        $hairdresser = \App\Models\HairdresserProfile::with(['user', 'specialties', 'salon', 'reviews.client'])
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json($hairdresser);
    }

    public function posts(string $slug)
    {
        $hairdresser = \App\Models\HairdresserProfile::where('slug', $slug)->firstOrFail();

        $posts = \App\Models\Post::with(['hairdresser.user', 'images', 'specialty'])
            ->where('hairdresser_id', $hairdresser->id)
            ->where('is_published', true)
            ->orderByDesc('created_at')
            ->paginate(12);

        return response()->json($posts);
    }

    public function feed(Request $request)
    {
        $posts = \App\Models\Post::with(['hairdresser.user', 'hairdresser.specialties', 'images', 'specialty'])
            ->where('is_published', true)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($posts);
    }
}
