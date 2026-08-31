<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Une mesure de rang, figée à une date.
 *
 * Voir la migration create_specialty_rank_snapshots_table : le rang est
 * recalculé à la volée à chaque affichage et n'était jamais conservé, donc
 * impossible de montrer un mouvement. Ces lignes sont la mémoire qui manquait.
 */
class SpecialtyRankSnapshot extends Model
{
    protected $fillable = [
        'hairdresser_id',
        'specialty_id',
        'geo',
        'geo_value',
        'rank',
        'total',
        'captured_on',
    ];

    protected $casts = [
        'captured_on' => 'date',
        'rank'        => 'integer',
        'total'       => 'integer',
    ];

    /** Valeur stockée au niveau national — jamais NULL, sinon l'index unique ne joue pas. */
    public const PAYS = 'FR';
}
