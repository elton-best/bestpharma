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

        // Connexion directe nominative sans double opt-in (MFA désactivé sur demande utilisateur)
        $token = $user->createToken($deviceName, ['*'])->plainTextToken;
        $user->update(['last_activity_at' => now()]);

        return response()->json([
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
        ]);

        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Session non authentifiée.'], 401);
        }

        $isValid = $this->google2fa->verifyKey($user->mfa_secret, $request->code, 2); // fenêtre de 2 pas (60s)

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

        // Révocation du token temporaire et émission du token plein accès
        $request->user()->currentAccessToken()->delete();

        $deviceName = $request->input('device_name', $request->userAgent() ?? 'Inconnu');
        $token = $user->createToken($deviceName, ['*'])->plainTextToken;
        $user->update(['last_activity_at' => now()]);

        return response()->json([
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
