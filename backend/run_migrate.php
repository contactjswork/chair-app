<?php

define('LARAVEL_START', microtime(true));
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$exit = Artisan::call('migrate', ['--force' => true]);
echo Artisan::output();
echo 'Exit code: ' . $exit . PHP_EOL;
