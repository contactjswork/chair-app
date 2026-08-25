<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Le badge « Certifié CHAIR » (slug `verified`) portait la description
 * « Abonné CHAIR+ » — servie telle quelle par l'API publique
 * (BadgeService::toArrayShape → champ `desc`) et donc affichée aux CLIENTS
 * sur l'onglet Badges d'un profil.
 *
 * Décision Julien (24/08/2026) : aucun produit d'abonnement (CHAIR+,
 * CHAIR Business) ne doit être mentionné dans l'app client. C'est aussi plus
 * sûr au regard de la guideline App Store 3.1.1(a) : nommer un abonnement
 * numérique payant dans le binaire client attire l'attention sur un achat
 * qui ne passe pas par l'achat intégré.
 *
 * Le titre du badge (« Certifié CHAIR ») ne change pas ; seule la
 * description est reformulée. Le critère d'obtention reste hasChairPlus()
 * côté BadgeService — invisible pour l'utilisateur.
 */
class RenameVerifiedBadgeDescription extends Migration
{
    private const OLD = 'Abonné CHAIR+';
    private const NEW = 'Profil bénéficiant du statut Certifié CHAIR.';

    public function up()
    {
        DB::table('badges')
            ->where('slug', 'verified')
            ->where('description', self::OLD)
            ->update(['description' => self::NEW, 'updated_at' => now()]);
    }

    public function down()
    {
        DB::table('badges')
            ->where('slug', 'verified')
            ->where('description', self::NEW)
            ->update(['description' => self::OLD, 'updated_at' => now()]);
    }
}
