<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Catalogue de badges administrable (voir migration 2026_08_17_140000 et
 * App\Services\BadgeService, seul lecteur de ce modèle pour la logique
 * métier). criteria=null => logique dédiée dans
 * BadgeService::hardcodedUnlocked() (slug listé dans
 * BadgeService::HARDCODED_SLUGS) ; criteria={metric,operator,value} =>
 * évalué génériquement par BadgeService::evaluateCriteria().
 */
class Badge extends Model
{
    protected $fillable = [
        'slug', 'title', 'description', 'icon', 'category', 'family',
        'rarity', 'tier', 'reward', 'criteria', 'roles', 'visible',
        'enabled', 'order',
    ];

    protected $casts = [
        'criteria' => 'array',
        'roles'    => 'array',
        'visible'  => 'boolean',
        'enabled'  => 'boolean',
        'tier'     => 'integer',
        'reward'   => 'integer',
        'order'    => 'integer',
    ];
}
