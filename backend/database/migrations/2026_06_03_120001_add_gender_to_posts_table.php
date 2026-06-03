<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddGenderToPostsTable extends Migration
{
    public function up()
    {
        DB::statement("ALTER TABLE posts ADD COLUMN gender VARCHAR(10) NULL DEFAULT NULL AFTER description");

        // Migrer les specialty_id existants vers post_tags
        // (chaque post existant avec une specialty_id obtient ce tag automatiquement)
        DB::statement("
            INSERT IGNORE INTO post_tags (post_id, specialty_id)
            SELECT id, specialty_id FROM posts WHERE specialty_id IS NOT NULL
        ");
    }

    public function down()
    {
        DB::statement("ALTER TABLE posts DROP COLUMN gender");
        DB::statement("TRUNCATE TABLE post_tags");
    }
}
