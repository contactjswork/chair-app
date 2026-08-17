<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rôles admin granulaires (super_admin|admin|moderator), distincts du champ
 * users.role qui reste juste 'admin' (comme aujourd'hui) pour dire "ce
 * compte a accès à l'espace admin". admin_role_id précise LEQUEL des 3
 * niveaux. Voir users.admin_role_id (migration suivante) et
 * AdminRole::permissions() (pivot admin_role_permission).
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_roles');
    }
};
