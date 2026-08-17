<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Volontairement absent de User::$fillable (même logique que
 * suspended_at) : un compte ne doit jamais pouvoir s'auto-attribuer ou
 * changer son propre rôle admin via un update de profil classique. Seul
 * AdminAccountController (permission admins.manage, réservée Super Admin)
 * doit écrire cette colonne.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('admin_role_id')->nullable()->after('role')
                ->constrained('admin_roles')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['admin_role_id']);
            $table->dropColumn('admin_role_id');
        });
    }
};
