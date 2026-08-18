<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photo réelle de la spécialité (Cloudinary), éditable depuis
 * /admin/specialites — même logique que `name`, `icon`, `description` :
 * une seule source de vérité en base, aucun déploiement requis pour
 * changer/ajouter une image. Voir AdminSpecialtyController::uploadImage()
 * et frontend/lib/specialties.ts pour la propagation en direct.
 */
class AddImageUrlToSpecialtiesTable extends Migration
{
    public function up()
    {
        Schema::table('specialties', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('icon');
        });
    }

    public function down()
    {
        Schema::table('specialties', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });
    }
}
