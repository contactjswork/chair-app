<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Schéma seul — le CRUD admin (endpoints, page frontend) est laissé à
 * l'agent suivant. Toute écriture devra passer par AdminAuditLogger::log()
 * avec resource_type='feature_flag'.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->boolean('enabled')->default(false);
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('feature_flags');
    }
};
