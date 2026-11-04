<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Emplacement extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'emplacements';

    protected $fillable = [
        'officine_id',
        'code',
        'libelle',
        'type_zone',
        'accepte_thermolabile',
        'accepte_stupefiant',
        'accepte_liste',
        'capacite',
        'actif',
    ];

    protected $casts = [
        'accepte_thermolabile' => 'boolean',
        'accepte_stupefiant' => 'boolean',
        'accepte_liste' => 'boolean',
        'actif' => 'boolean',
        'capacite' => 'integer',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(StockLot::class, 'emplacement_id');
    }

    /**
     * Contraintes métier STO-04 :
     * - Frigo n'accepte que thermolabiles
     * - Armoire n'accepte que stupéfiants/listes
     */
    public function peutAccueillir(Produit $produit): bool
    {
        if ($this->type_zone === 'frigo' && !$produit->est_thermolabile && !$produit->classe_produit === 'thermolabile') {
            // Frigo réservé aux thermolabiles (tolérance si produit déjà marqué)
            // On bloque les non-thermolabiles en frigo
            return false;
        }
        if ($this->type_zone === 'armoire_securisee') {
            $autorises = ['stupefiant', 'liste_1', 'liste_2', 'psychotrope'];
            if (!in_array($produit->tableau_substance, $autorises) && !in_array($produit->classe_produit, $autorises)) {
                return false;
            }
        }
        return true;
    }

    public static function zonesParDefaut(): array
    {
        return [
            ['code' => 'COMPTOIR', 'libelle' => 'Comptoir — Délivrance', 'type_zone' => 'comptoir', 'accepte_thermolabile' => false, 'accepte_stupefiant' => false, 'accepte_liste' => true],
            ['code' => 'RESERVE', 'libelle' => 'Réserve — Stock principal', 'type_zone' => 'reserve', 'accepte_thermolabile' => false, 'accepte_stupefiant' => false, 'accepte_liste' => true],
            ['code' => 'FRIGO', 'libelle' => 'Réfrigérateur 2°C–8°C', 'type_zone' => 'frigo', 'accepte_thermolabile' => true, 'accepte_stupefiant' => false, 'accepte_liste' => false],
            ['code' => 'ARMOIRE', 'libelle' => 'Armoire sécurisée — Stupéfiants & Listes', 'type_zone' => 'armoire_securisee', 'accepte_thermolabile' => false, 'accepte_stupefiant' => true, 'accepte_liste' => true],
            ['code' => 'ATTENTE', 'libelle' => "Zone d'attente de contrôle", 'type_zone' => 'attente_controle', 'accepte_thermolabile' => true, 'accepte_stupefiant' => true, 'accepte_liste' => true],
            ['code' => 'RETOURS', 'libelle' => 'Zone des retours fournisseur', 'type_zone' => 'retours', 'accepte_thermolabile' => false, 'accepte_stupefiant' => false, 'accepte_liste' => false],
            ['code' => 'DECHETS', 'libelle' => 'Aire des déchets sécurisée', 'type_zone' => 'dechets', 'accepte_thermolabile' => false, 'accepte_stupefiant' => true, 'accepte_liste' => true],
        ];
    }
}
