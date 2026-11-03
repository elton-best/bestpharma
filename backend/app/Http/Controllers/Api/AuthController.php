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

        // Vérification de l'obligation de la double authentification TOTP (AC-04, NF-05)
        $mfaRequired = $user->isMfaRequired() || $user->mfa_enabled;

        if ($mfaRequired) {
            if (! $user->mfa_enabled || empty($user->mfa_secret)) {
                // L'utilisateur doit obligatoirement initialiser son MFA avant tout accès
                $newSecret = $this->google2fa->generateSecretKey();
                $user->mfa_secret = $newSecret;
                $user->save();

                $otpAuthUrl = $this->google2fa->getQRCodeUrl(
                    'BEGPHARMA',
                    $user->email,
                    $newSecret
                );

                $tempToken = $user->createToken('mfa-setup-token', ['mfa:setup'], now()->addMinutes(15))->plainTextToken;

                return response()->json([
                    'mfa_required' => true,
                    'mfa_setup_required' => true,
                    'temp_token' => $tempToken,
                    'secret' => $newSecret,
                    'qr_code_url' => $otpAuthUrl,
                    'message' => 'Configuration obligatoire du MFA TOTP requise pour votre rôle.',
                ]);
            }

            // MFA déjà configuré : demande du code TOTP
            $tempToken = $user->createToken('mfa-verify-token', ['mfa:verify'], now()->addMinutes(10))->plainTextToken;

            return response()->json([
                'mfa_required' => true,
                'mfa_setup_required' => false,
                'temp_token' => $tempToken,
                'message' => 'Veuillez saisir votre code d\'authentification à deux facteurs (TOTP).',
            ]);
        }

        // Connexion directe sans MFA
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
