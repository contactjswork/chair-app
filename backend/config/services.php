<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Push APNs natif (aucun SDK tiers) — voir App\Services\ApnsService.
    // Diagnostic : php artisan chair:test-push {email}
    'apns' => [
        'key_path'      => env('APNS_KEY_PATH'),
        'key_id'        => env('APNS_KEY_ID'),
        'team_id'       => env('APNS_TEAM_ID'),
        'bundle_id'     => env('APNS_BUNDLE_ID', 'app.getchair.client'),
        'bundle_id_pro' => env('APNS_BUNDLE_ID_PRO', 'app.getchair.pro'),
        'environment'   => env('APNS_ENVIRONMENT', 'production'),
        // Surcharge du host APNs, réservée aux tests locaux (mock) —
        // ne JAMAIS définir APNS_HOST en production.
        'host'          => env('APNS_HOST'),
    ],

    'mapkit' => [
        'team_id'          => env('MAPKIT_TEAM_ID'),
        'key_id'           => env('MAPKIT_KEY_ID'),
        'private_key_path' => env('MAPKIT_PRIVATE_KEY_PATH'),
        'restrict_origin'  => env('MAPKIT_RESTRICT_ORIGIN', false),
    ],

    'stripe' => [
        'secret'                 => env('STRIPE_SECRET'),
        'webhook_secret'         => env('STRIPE_WEBHOOK_SECRET'),
        'price_chair_plus'       => env('STRIPE_PRICE_CHAIR_PLUS'),
        'price_chair_business'   => env('STRIPE_PRICE_CHAIR_BUSINESS'),
    ],

    // Achat intégré Apple — CHAIR+ acheté depuis le binaire CHAIR PRO iOS.
    // shared_secret : « clé secrète partagée » App Store Connect (app CHAIR PRO
    // → Informations sur l'app → Clé secrète partagée) — sert à /verifyReceipt.
    // product_chair_plus : identifiant EXACT du produit d'abonnement créé dans
    // App Store Connect ; doit rester synchronisé avec PRODUIT_CHAIR_PLUS
    // (frontend/lib/iap.ts).
    'apple_iap' => [
        'shared_secret'      => env('APPLE_IAP_SHARED_SECRET'),
        'product_chair_plus' => env('APPLE_IAP_PRODUCT_CHAIR_PLUS', 'app.getchair.pro.chairplus.monthly'),
        // Bundle de l'app CHAIR PRO — le reçu Apple DOIT le porter, sinon c'est
        // le reçu d'une autre app (défense en profondeur, audit 01/09/2026).
        'bundle_id'          => env('APPLE_IAP_BUNDLE_ID', 'app.getchair.pro'),
    ],

];
