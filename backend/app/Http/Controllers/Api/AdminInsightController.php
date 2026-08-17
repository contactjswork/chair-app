<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Insights business — voir rapport de mission "Statistiques et Insights"
 * partie (b)/(c). Contrôleur neuf, distinct d'AdminController (dashboard/
 * moderation/...) : concentre les croisements demande-vs-offre et
 * couverture géographique, tous en lecture seule (permission analytics.read
 * sur les deux routes, voir routes/api.php).
 *
 * IMPORTANT (voir rapport) : aucun tracking des recherches réellement
 * effectuées sur CHAIR n'existe en base (ni table dédiée, ni colonne sur
 * ExploreController/SearchController — vérifié). L'insight "340 recherches
 * Boucles & Curly à Strasbourg, 4 professionnels" demandé par Julien N'EST
 * DONC PAS calculable avec les données actuelles et n'a PAS été inventé
 * ici. demandSupply() ci-dessous est un PROXY assumé : la demande y est
 * approximée par les préférences déclarées à l'inscription
 * (user_preferences.interests, mêmes slugs que la taxonomie specialties —
 * vérifié dans app/app/onboarding/page.tsx), pas par un comportement de
 * recherche réel. Un vrai tracking de recherche (table search_queries :
 * ville/spécialité/date, agrégée, jamais nominative pour rester RGPD-clean)
 * est un prérequis pour livrer l'insight exact demandé par Julien.
 */
class AdminInsightController extends Controller
{
    /** Même défense en profondeur que AdminController::checkAdmin() — voir ce fichier pour le detail. */
    private function checkAdmin(Request $request): bool
    {
        $user = $request->user();
        return $user && $user->role === 'admin' && !$user->suspended_at;
    }

    /**
     * GET /admin/insights/demand-supply — demande (proxy) vs offre réelle,
     * par ville x spécialité. Voir docblock de classe pour la limite
     * assumée du proxy.
     *
     * Demande : nombre de clients dont city est renseignée ET dont
     * user_preferences.interests contient ce slug de spécialité.
     * Offre : nombre de coiffeurs (profil visible, compte non suspendu)
     * dans la même ville qui déclarent cette spécialité
     * (hairdresser_specialties).
     *
     * Une seule requête par côté (pas de N+1) ; le JSON interests est
     * décodé et agrégé en PHP (une requête JSON_CONTAINS par spécialité
     * aurait demandé une requête par spécialité, donc un N+1 déguisé).
     */
    public function demandSupply(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Sous ce seuil, une ville+spécialité ne remonte pas — 1 ou 2
        // utilisateurs ayant coché une case à l'inscription ne constituent
        // pas un signal de demande exploitable, seulement du bruit.
        $minDemand = max(1, (int) $request->get('min_demand', 3));
        $limit     = min(100, max(1, (int) $request->get('limit', 30)));

        $rows = DB::table('user_preferences')
            ->join('users', 'users.id', '=', 'user_preferences.user_id')
            ->where('users.role', 'client')
            ->whereNotNull('users.city')
            ->whereNotNull('user_preferences.interests')
            ->select('users.city', 'user_preferences.interests')
            ->get();

        $demand = [];
        foreach ($rows as $row) {
            $city = trim((string) $row->city);
            if ($city === '') {
                continue;
            }
            $interests = json_decode($row->interests, true);
            if (!is_array($interests)) {
                continue;
            }
            foreach ($interests as $slug) {
                if (!is_string($slug) || $slug === '') {
                    continue;
                }
                $demand[$city][$slug] = ($demand[$city][$slug] ?? 0) + 1;
            }
        }

        $supplyRows = DB::table('hairdresser_specialties')
            ->join('hairdresser_profiles', 'hairdresser_profiles.id', '=', 'hairdresser_specialties.hairdresser_id')
            ->join('specialties', 'specialties.id', '=', 'hairdresser_specialties.specialty_id')
            ->join('users', 'users.id', '=', 'hairdresser_profiles.user_id')
            ->whereNotNull('hairdresser_profiles.city')
            ->where('hairdresser_profiles.is_hidden', false)
            ->whereNull('users.suspended_at')
            ->select('hairdresser_profiles.city', 'specialties.slug', DB::raw('COUNT(*) as cnt'))
            ->groupBy('hairdresser_profiles.city', 'specialties.slug')
            ->get();

        $supply = [];
        foreach ($supplyRows as $row) {
            $supply[trim((string) $row->city)][$row->slug] = (int) $row->cnt;
        }

        $specialtyNames = Specialty::pluck('name', 'slug');

        $results = [];
        foreach ($demand as $city => $slugs) {
            foreach ($slugs as $slug => $demandCount) {
                if ($demandCount < $minDemand) {
                    continue;
                }
                $supplyCount = $supply[$city][$slug] ?? 0;
                $results[] = [
                    'city'           => $city,
                    'specialty_slug' => $slug,
                    'specialty_name' => $specialtyNames[$slug] ?? $slug,
                    'demand_count'   => $demandCount,
                    'supply_count'   => $supplyCount,
                    // Écart brut demande-offre — plus c'est haut, plus la
                    // ville est sous-servie pour cette spécialité.
                    'gap'            => $demandCount - $supplyCount,
                ];
            }
        }

        usort($results, fn ($a, $b) => $b['gap'] <=> $a['gap']);
        $results = array_slice($results, 0, $limit);

        return response()->json([
            'data'             => $results,
            'min_demand_threshold' => $minDemand,
            'methodology'      => "Demande = clients ayant déclaré cette spécialité dans leurs préférences d'inscription (user_preferences.interests), groupés par ville. Offre = coiffeurs visibles et non suspendus déclarant cette spécialité dans la même ville.",
            'limitation'       => "PROXY, pas une mesure de recherche réelle : reflète des préférences déclarées une fois à l'inscription, pas un comportement de recherche répété dans le temps. Aucun tracking des requêtes de recherche (ExploreController/SearchController) n'existe en base aujourd'hui — c'est un prérequis pour livrer l'insight de recherche réelle demandé (ex: \"340 recherches Boucles & Curly à Strasbourg\").",
        ]);
    }

    /**
     * GET /admin/insights/geo-coverage — clients vs professionnels par ville
     * (couverture géographique globale, toutes spécialités confondues).
     * Complète demandSupply() (qui, lui, descend au niveau spécialité).
     */
    public function geoCoverage(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $limit = min(100, max(1, (int) $request->get('limit', 30)));

        $clientsByCity = User::where('role', 'client')
            ->whereNotNull('city')
            ->selectRaw('city, COUNT(*) as count')
            ->groupBy('city')
            ->get()
            ->pluck('count', 'city');

        $prosByCity = HairdresserProfile::whereNotNull('hairdresser_profiles.city')
            ->where('hairdresser_profiles.is_hidden', false)
            ->join('users', 'users.id', '=', 'hairdresser_profiles.user_id')
            ->whereNull('users.suspended_at')
            ->selectRaw('hairdresser_profiles.city as city, COUNT(*) as count')
            ->groupBy('hairdresser_profiles.city')
            ->get()
            ->pluck('count', 'city');

        $salonsByCity = Salon::whereNotNull('city')
            ->whereNull('suspended_at')
            ->selectRaw('city, COUNT(*) as count')
            ->groupBy('city')
            ->get()
            ->pluck('count', 'city');

        $allCities = collect($clientsByCity->keys())
            ->merge($prosByCity->keys())
            ->unique()
            ->values();

        $overview = $allCities->map(function ($city) use ($clientsByCity, $prosByCity, $salonsByCity) {
            $clients = (int) ($clientsByCity[$city] ?? 0);
            $pros    = (int) ($prosByCity[$city] ?? 0);

            return [
                'city'                     => $city,
                'clients_count'            => $clients,
                'professionals_count'      => $pros,
                'salons_count'             => (int) ($salonsByCity[$city] ?? 0),
                // null si aucun professionnel — pas un "0 client par pro" trompeur.
                'clients_per_professional' => $pros > 0 ? round($clients / $pros, 1) : null,
            ];
        });

        $byClients = $overview->sortByDesc('clients_count')->values()->take($limit);

        // "Faible couverture" = villes avec une base clients réelle (>=5,
        // seuil anti-bruit) mais peu ou pas de professionnels — celles-ci
        // remontent en tête même si leur volume clients absolu est modeste.
        $lowCoverage = $overview
            ->filter(fn ($c) => $c['clients_count'] >= 5 && $c['professionals_count'] <= 2)
            ->sortByDesc('clients_count')
            ->values()
            ->take($limit);

        return response()->json([
            'by_clients'   => $byClients,
            'low_coverage' => $lowCoverage,
            'methodology'  => "Ville = colonne city déclarée sur le profil client / le profil coiffeur / le salon (chaîne exacte, pas de rapprochement flou entre orthographes différentes). Professionnel visible = hairdresser_profiles.is_hidden=false et compte non suspendu.",
            'limitation'   => "Comparaison par ville déclarée, pas par rayon géographique réel (les clients n'ont pas de département/région stockés, seulement une ville libre) — un vrai calcul par rayon demanderait de géocoder systématiquement chaque client, hors scope RGPD-raisonnable pour un simple dashboard admin.",
        ]);
    }
}
