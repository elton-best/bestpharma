<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MouvementStock extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'mouvements_stock';

    protected $fillable = [
        'officine_id',
        'stock_lot_id',
        'produit_id',
        'type_mouvement',
        'quantite',
        'stock_avant',
        'stock_apres',
        'emplacement_source',
        'emplacement_cible',
        'reference_piece',
        'auteur_id',
        'validateur_id',
        'motif',
        'metadonnees',
    ];

    protected $casts = [
        'quantite' => 'integer',
        'stock_avant' => 'integer',
        'stock_apres' => 'integer',
        'metadonnees' => 'array',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function lot(): BelongsTo { return $this->belongsTo(StockLot::class, 'stock_lot_id'); }
    public function produit(): BelongsTo { return $this->belongsTo(Produit::class); }
    public function auteur(): BelongsTo { return $this->belongsTo(User::class, 'auteur_id'); }
    public function validateur(): BelongsTo { return $this->belongsTo(User::class, 'validateur_id'); }

    public const TYPES_VENDABLES = ['commercialisable'];
    public const TYPES_NON_VENDABLES = ['en_attente_controle', 'a_evaluer', 'quarantaine', 'attente_retour', 'rejete', 'dechet', 'epuise'];

    public static function libelle(string $type): string
    {
        return match ($type) {
            'entree_reception' => 'Entrée — Réception',
            'vente' => 'Sortie — Vente',
            'retour_client' => 'Entrée — Retour client (MNU)',
            'retour_fournisseur' => 'Sortie — Retour fournisseur',
            'transfert_emplacement' => 'Transfert d’emplacement',
            'casse' => 'Casse / Avarié',
            'demarque' => 'Démarque',
            'destruction' => 'Destruction',
            'ajustement_inventaire' => 'Ajustement d’inventaire',
            'changement_statut' => 'Changement de statut',
            'contre_passation' => 'Contre-passation (correction)',
            default => $type,
        };
    }
}
