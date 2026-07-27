<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Consolide les 29 spécialités granulaires en 10 "domaines d'expertise"
 * universels CHAIR — décision produit du 2026-07-09 (philosophie
 * spécialités = SEO principal, services = déclinaison commerciale).
 *
 * Chaque cluster fusionne vers une ligne "survivante" (id conservé, donc
 * aucune FK cassée) ; les autres lignes du cluster sont réassignées puis
 * désactivées (is_active=false), jamais supprimées — conserve l'historique
 * et évite de casser une référence texte résiduelle côté front.
 */
return new class extends Migration
{
    private array $clusters = [
        // slug_survivant => [nouveau nom, nouveau slug, [autres anciens slugs à fusionner]]
        'coupe-homme' => ['Coupe Homme', 'coupe-homme', ['barber', 'buzz-cut', 'degrade', 'fade', 'taper']],
        'barbe'       => ['Barbe', 'barbe', []],
        'coupe-femme' => ['Coupe Femme', 'coupe-femme', ['coupe-courte', 'coupe-longue', 'frange']],
        'balayage'    => ['Couleur & Balayage', 'couleur-balayage', ['blond', 'coloration', 'couleur-homme', 'hair-contouring', 'ombre-hair', 'roux', 'tie-dye']],
        'lissage'     => ['Texture & Lissage', 'texture-lissage', ['keratine', 'ondulations']],
        'boucles'     => ['Boucles & Curly', 'boucles-curly', []],
        'dreads'      => ['Afro & Locks', 'afro-locks', ['braid']],
        'extensions'  => ['Extensions', 'extensions', []],
        'mariage'     => ['Événementiel', 'evenementiel', ['chignon', 'coiffure-soiree']],
    ];

    public function up(): void
    {
        foreach ($this->clusters as $survivorSlug => [$newName, $newSlug, $mergeSlugs]) {
            $survivor = DB::table('specialties')->where('slug', $survivorSlug)->first();
            if (!$survivor) continue;

            DB::table('specialties')->where('id', $survivor->id)->update([
                'name'       => $newName,
                'slug'       => $newSlug,
                'is_active'  => true,
                'updated_at' => now(),
            ]);

            foreach ($mergeSlugs as $oldSlug) {
                $old = DB::table('specialties')->where('slug', $oldSlug)->first();
                if (!$old || $old->id === $survivor->id) continue;

                $hairdresserIds = DB::table('hairdresser_specialties')
                    ->where('specialty_id', $old->id)->pluck('hairdresser_id');
                foreach ($hairdresserIds as $hid) {
                    DB::table('hairdresser_specialties')->insertOrIgnore([
                        'hairdresser_id' => $hid, 'specialty_id' => $survivor->id,
                    ]);
                }
                DB::table('hairdresser_specialties')->where('specialty_id', $old->id)->delete();

                DB::table('posts')->where('specialty_id', $old->id)->update(['specialty_id' => $survivor->id]);

                DB::table('specialties')->where('id', $old->id)->update([
                    'is_active' => false, 'updated_at' => now(),
                ]);
            }
        }

        if (!DB::table('specialties')->where('slug', 'soins-transformation')->exists()) {
            DB::table('specialties')->insert([
                'name'       => 'Soins & Transformation',
                'slug'       => 'soins-transformation',
                'icon'       => null,
                'category'   => null,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Fusion destructive sur les pivots — pas de rollback fiable, no-op volontaire.
    }
};
