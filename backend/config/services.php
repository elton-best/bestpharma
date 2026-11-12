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

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // FeexPay (agrégateur mobile money BJ/TG) - paiement des cotisations Socialisation.
    // Identifiants à fournir par la direction ; en attendant, les appels échouent proprement
    // (ValidationException) plutôt que de planter, voir FeexPayService.
    'feexpay' => [
        'base_url' => env('FEEXPAY_BASE_URL', 'https://api-v2.feexpay.me'),
        'shop_id' => env('FEEXPAY_SHOP_ID'),
        'api_key' => env('FEEXPAY_API_KEY'),
        'callback_url' => env('FEEXPAY_CALLBACK_URL'),
        // SANDBOX pendant les tests, LIVE en production - transmis tel quel au SDK JS
        // cote frontend (FeexPayButton.init({ mode: ... })).
        'mode' => env('FEEXPAY_MODE', 'SANDBOX'),
    ],

    // e-MECeF (DGI Benin) - facture normalisee : code MECeF/DGI + QR code
    // ajoutes a la demande sur une facture, sans changer son format actuel.
    // Un seul point de vente chez BEG, donc un seul jeton. Tant qu'il n'est
    // pas fourni, les appels echouent proprement (voir MecefService::isConfigured()),
    // la facture reste utilisable normalement.
    'mecef' => [
        'invoice_url' => env('MECEF_MODE', 'test') === 'production'
            ? 'https://sygmef.impots.bj/emcf/api/invoice'
            : 'https://developper.impots.bj/sygmef-emcf/api/invoice',
        'info_url' => env('MECEF_MODE', 'test') === 'production'
            ? 'https://sygmef.impots.bj/emcf/api/info'
            : 'https://developper.impots.bj/sygmef-emcf/api/info',
        'token' => env('MECEF_TOKEN'),
        // IFU de BEG (13 caracteres) - champ obligatoire de chaque requete DGI.
        'ifu' => env('MECEF_IFU'),
        'mode' => env('MECEF_MODE', 'test'),
    ],

    'firebase' => [
        'enabled' => env('FCM_ENABLED', true),
        'project_id' => env('FIREBASE_PROJECT_ID'),
        'credentials_path' => env('FIREBASE_CREDENTIALS_PATH') ?: storage_path('app/private/firebase/firebase-service-account.json'),
        'timeout' => env('FCM_TIMEOUT', 10),
    ],

    'app_notifications' => [
        'mail_enabled' => env('APP_NOTIFICATIONS_MAIL_ENABLED', true),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
        'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
        'timeout' => (int) env('GEMINI_TIMEOUT', 15),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI'),
    ],

    'billing' => [
        'webhook_secret' => env('BILLING_WEBHOOK_SECRET'),
    ],

];
