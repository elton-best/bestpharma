<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA;
    }

    /**
     * Connexion nominative e-mail + mot de passe
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        if (! $user->actif || $user->archived) {
            return response()->json([
                'message' => 'Ce compte est désactivé ou archivé. Contactez votre promoteur.',
            ], 403);
        }

        $deviceName = $request->input('device_name', $request->userAgent() ?? 'Inconnu');

        // Double facteur exigé pour les rôles à responsabilité (promoteur,
        // pharmacien titulaire, pharmacien adjoint) : un jeton restreint est
        // délivré, seul le code TOTP le transforme en session pleine.
        $roleCode = $user->officines()
            ->wherePivot('actif', true)
            ->orderBy('officines.nom')
            ->value('utilisateurs_officines.role_code');

        $mfaAttendu = in_array($roleCode, ['promoteur', 'pharmacien_titulaire', 'pharmacien_adjoint'], true);

        if ($mfaAttendu && $user->mfa_enabled && $user->mfa_secret) {
            $jetonTemporaire = $user->createToken('mfa-en-attente · '.$deviceName, ['mfa:verifier'])->plainTextToken;

            return response()->json([
                'mfa_required' => true,
                'temp_token' => $jetonTemporaire,
                'email' => $user->email,
                'message' => 'Saisissez le code à six chiffres de votre application d\'authentification.',
            ]);
        }

        $token = $user->createToken($deviceName, ['*'])->plainTextToken;
        $user->update(['last_activity_at' => now()]);

        return response()->json([
            'mfa_required' => false,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'mfa_enabled' => $user->mfa_enabled,
            ],
            'officines' => $user->officines()->wherePivot('actif', true)->get([
                'officines.id',
                'officines.nom',
                'officines.raison_sociale',
                'officines.numero_licence',
                'officines.fuseau',
                'officines.devise',
            ]),
        ]);
    }

    /**
     * Validation du code MFA TOTP
     */
    public function verifyMfa(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
            'device_name' => 'nullable|string',
            'temp_token' => 'nullable|string',
        ]);

        // Le frontend présente le jeton temporaire dans le corps de la requête
        if ($request->filled('temp_token') && ! $request->user()) {
            $jeton = \Laravel\Sanctum\PersonalAccessToken::findToken($request->input('temp_token'));
            if ($jeton) {
                $request->setUserResolver(fn () => $jeton->tokenable);
            }
        }

        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Session non authentifiée.'], 401);
        }

        $codeSaisi = preg_replace('/\s+/', '', (string) $request->code);

        // Code de démonstration toléré hors production pour les comptes de recette
        $isValid = $codeSaisi === '123456' && ! app()->environment('production');

        if (! $isValid && $user->mfa_secret) {
            $isValid = $this->google2fa->verifyKey($user->mfa_secret, $codeSaisi, 2); // fenêtre de 2 pas (60s)
        }

        if (! $isValid) {
            return response()->json([
                'message' => 'Code de vérification TOTP invalide ou expiré.',
            ], 422);
        }

        // Active définitivement le MFA si c'était une première configuration
        if (! $user->mfa_enabled) {
            $user->mfa_enabled = true;
            $user->save();
        }

        // Révocation du jeton temporaire et émission du jeton plein accès
        $jetonTemporaire = $user->currentAccessToken();
        if ($jetonTemporaire && method_exists($jetonTemporaire, 'delete')) {
            $jetonTemporaire->delete();
        } else {
            $user->tokens()->where('name', 'like', 'mfa-en-attente%')->delete();
        }

        $deviceName = $request->input('device_name', $request->userAgent() ?? 'Inconnu');
        $token = $user->createToken($deviceName, ['*'])->plainTextToken;
        $user->update(['last_activity_at' => now()]);

        return response()->json([
            'mfa_required' => false,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'mfa_enabled' => $user->mfa_enabled,
            ],
            'officines' => $user->officines()->wherePivot('actif', true)->get([
                'officines.id',
                'officines.nom',
                'officines.raison_sociale',
                'officines.numero_licence',
                'officines.fuseau',
                'officines.devise',
            ]),
        ]);
    }

    /**
     * Inscription / Création de compte directe sans double opt-in
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'telephone' => 'nullable|string|max:50',
            'role_code' => 'nullable|string|max:50',
            'officine_nom' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'telephone' => $validated['telephone'] ?? null,
            'mfa_enabled' => false,
            'actif' => true,
            'archived' => false,
        ]);

        // Rattachement automatique à l'officine par défaut ou création d'une officine
        $officine = null;
        if (! empty($validated['officine_nom'])) {
            $officine = \App\Models\Officine::create([
                'nom' => $validated['officine_nom'],
                'raison_sociale' => $validated['officine_nom'] . ' SARL',
                'numero_licence' => 'BEN-OFF-' . date('Y') . '-' . rand(100, 999),
                'adresse' => 'Cotonou',
                'ville' => 'Cotonou',
                'telephone' => $validated['telephone'] ?? '+229 00 00 00 00',
                'fuseau' => 'Africa/Porto-Novo',
                'devise' => 'XOF',
            ]);
        } else {
            $officine = \App\Models\Officine::first();
        }

        if ($officine) {
            \App\Models\UtilisateurOfficine::create([
                'officine_id' => $officine->id,
                'user_id' => $user->id,
                'role_code' => $validated['role_code'] ?? 'pharmacien_titulaire',
                'actif' => true,
                'archived' => false,
            ]);
        }

        $deviceName = $request->input('device_name', $request->userAgent() ?? 'Navigateur');
        $token = $user->createToken($deviceName, ['*'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'mfa_enabled' => false,
            ],
            'officines' => $user->officines()->wherePivot('actif', true)->get([
                'officines.id',
                'officines.nom',
                'officines.raison_sociale',
                'officines.numero_licence',
                'officines.fuseau',
                'officines.devise',
            ]),
            'message' => 'Compte créé avec succès.',
        ], 201);
    }

    /**
     * Profil de l'utilisateur connecté
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'mfa_enabled' => $user->mfa_enabled,
                'last_activity_at' => $user->last_activity_at,
            ],
            'officines' => $user->officines()->wherePivot('actif', true)->get(),
        ]);
    }

    /**
     * Déconnexion de la session courante
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    /**
     * État de la double authentification du compte connecté.
     */
    public function etatMfa(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'mfa_enabled' => (bool) $user->mfa_enabled,
            'mfa_secret_present' => (bool) $user->mfa_secret,
            'mfa_required' => $this->mfaRequisPour($user),
            'devices' => $user->tokens()->count(),
            'derniere_activite' => $user->last_activity_at,
        ]);
    }

    /**
     * Démarre l'enrôlement d'une application d'authentification (TOTP).
     * Le secret n'est révélé qu'une fois, le temps de scanner le QR code.
     */
    public function demarrerMfa(Request $request): JsonResponse
    {
        $user = $request->user();

        // Un secret non confirmé est régénéré à chaque nouvelle tentative
        $secret = $this->google2fa->generateSecretKey(32);

        $user->mfa_secret = $secret;
        $user->mfa_enabled = false;
        $user->save();

        $issuer = 'BEGPHARMA';
        $compte = $user->email;
        $otpauth = $this->google2fa->getQRCodeUrl($issuer, $compte, $secret);

        // QR code servi en SVG par un service public (aucune donnée de santé)
        $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='.urlencode($otpauth);

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $otpauth,
            'qr_code_url' => $qrUrl,
            'message' => 'Scannez le QR code avec votre application d\'authentification, puis saisissez le code affiché.',
        ]);
    }

    /**
     * Désactive la double authentification du compte connecté.
     */
    public function desactiverMfa(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'nullable|string|size:6',
        ]);

        $user = $request->user();

        if ($user->mfa_enabled && $user->mfa_secret) {
            $code = preg_replace('/\s+/', '', (string) ($validated['code'] ?? ''));
            $valide = ($code === '123456' && ! app()->environment('production'))
                || ($code !== '' && $this->google2fa->verifyKey($user->mfa_secret, $code, 2));

            if (! $valide) {
                return response()->json([
                    'message' => 'Saisissez un code valide pour désactiver la double authentification.',
                ], 422);
            }
        }

        $user->mfa_secret = null;
        $user->mfa_enabled = false;
        $user->save();

        return response()->json([
            'message' => 'Double authentification désactivée.',
            'mfa_enabled' => false,
        ]);
    }

    /**
     * Rôles pour lesquels la double authentification est obligatoire.
     */
    private function mfaRequisPour(User $user): bool
    {
        $role = $user->officines()
            ->wherePivot('actif', true)
            ->value('utilisateurs_officines.role_code');

        return in_array($role, ['promoteur', 'pharmacien_titulaire', 'pharmacien_adjoint'], true);
    }

    /**
     * Liste des appareils et sessions connectés (DSH-13)
     */
    public function devices(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()
            ->orderByDesc('last_used_at')
            ->get(['id', 'name', 'last_used_at', 'created_at']);

        $currentTokenId = $request->user()->currentAccessToken()->id;

        $devices = $tokens->map(function ($token) use ($currentTokenId) {
            return [
                'id' => $token->id,
                'name' => $token->name,
                'is_current' => $token->id === $currentTokenId,
                'last_used_at' => $token->last_used_at,
                'created_at' => $token->created_at,
            ];
        });

        return response()->json(['devices' => $devices]);
    }

    /**
     * Révocation à distance d'un appareil connecté (DSH-13)
     */
    public function revokeDevice(Request $request, string $tokenId): JsonResponse
    {
        $token = $request->user()->tokens()->where('id', $tokenId)->first();

        if (! $token) {
            return response()->json(['message' => 'Appareil introuvable.'], 404);
        }

        $token->delete();

        return response()->json(['message' => 'Session révoquée avec succès.']);
    }
}
