<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Retour de Julien : la colonne `category` (Style/Coupe/Texture/Couleur/
 * Occasion...) n'a jamais servi qu'à un affichage cosmétique dans l'admin
 * (voir AdminSpecialtyController — aucune logique metier ne la lisait).
 * Elle devient la source vivante du genre d'une spécialité : uniquement
 * "Homme" ou "Femme", éditable sans build depuis Configuration > Spécialités.
 *
 * Les 14 actives reprennent exactement HOMME_SPECIALTY_SLUGS/
 * FEMME_SPECIALTY_SLUGS (frontend/lib/specialties.ts, décidé avec Julien le
 * 2026-08-18) ; les masquées (jamais affichées nulle part) reçoivent un
 * classement raisonnable, ajustable depuis l'admin si besoin.
 */
return new class extends Migration
{
    public function up(): void
    {
        $homme = [
            'barber', 'coupe-homme', 'coupe-longue', 'barbe', 'couleur-homme', 'afro-locks',
            // masquées
            'taper', 'fade', 'degrade', 'buzz-cut',
        ];
        $femme = [
            'couleur-balayage', 'coupe-femme', 'boucles-curly', 'texture-lissage',
            'coloration', 'evenementiel', 'extensions', 'soins-transformation',
            // masquées
            'blond', 'ombre-hair', 'hair-contouring', 'chignon', 'tie-dye',
            'coupe-courte', 'keratine', 'ondulations', 'frange', 'coiffure-soiree', 'roux',
        ];

        DB::table('specialties')->whereIn('slug', $homme)->update(['category' => 'Homme']);
        DB::table('specialties')->whereIn('slug', $femme)->update(['category' => 'Femme']);
    }

    public function down(): void
    {
        // Pas de retour arrière significatif — les anciennes valeurs
        // (Style/Coupe/Texture/Couleur/Occasion) n'étaient pas exploitées.
    }
};
