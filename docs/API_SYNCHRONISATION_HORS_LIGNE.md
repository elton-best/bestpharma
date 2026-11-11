# API de synchronisation hors ligne — périmètre limité

## État

Le portage ne fournit pas de file cliente Vue/Pinia : aucun client hors ligne ni consommateur cible de la file historique n’est établi dans le dépôt. L’API est limitée à la création ordonnée de **brouillons de demandes d’accompagnement**. Ce périmètre réutilise le contrat cible existant (`support_requests`, clé `request_key`, contrôle d’accès d’administration officine et audit).

Aucune opération de soumission, de planification, de visite, de température, de stock, de vente, de dispensation, de pointage, de caisse ou de fiscalité n’est synchronisable. Une demande créée hors ligne reste un brouillon et ne crée ni mission ni autorisation.

## Endpoint

`POST /api/v1/accompagnement/sync/push` — authentification Sanctum, contexte `X-Officine-ID`, module Accompagnement actif, administrateur actif de cette officine et limitation de débit. Le lot accepte de 1 à 50 opérations.

```json
{
  "operations": [{
    "operation_id": "9dcd32f7-96d5-4df6-9b4c-50acdd731daa",
    "entity": "support_request_draft",
    "action": "CREATE",
    "client_timestamp": "2026-11-03T11:00:00+01:00",
    "payload": {
      "title": "Besoin fictif",
      "description": "Description",
      "contact": "Contact",
      "theme": null,
      "availability": null,
      "urgency": "normal"
    }
  }]
}
```

Les opérations sont traitées dans l’ordre du tableau et le lot est atomique : un conflit annule le lot entier. L’identifiant d’opération est aussi la clé idempotente du brouillon, limitée à l’officine. Un rejeu identique renvoie `already_processed`; un contenu différent sous le même identifiant renvoie `409` (`code: sync_conflict`). La réponse conserve la chaîne exacte `client_timestamp` et retourne séparément `server_received_at`. L’heure client est une déclaration de l’appareil, jamais une preuve, un horaire serveur, une date de soumission ou un visa.

Les erreurs de validation utilisent `422` avec `code: validation_error`; une erreur transactionnelle inattendue utilise `500` avec `code: sync_failed`. Après reconnexion, le client peut renvoyer le lot non acquitté avec les mêmes identifiants. Les IDs étrangers ne sont pas accessibles et la synchronisation est revérifiée contre le tenant et l’appartenance active au moment de chaque requête.

## Évolution

Le journal technique `offline_sync_operations` conserve l’identifiant, l’empreinte, l’auteur, le brouillon lié, l’horodatage client exact et la réception serveur. Sa migration est additive et propre au module Accompagnement. L’ajout d’autres ressources exige un contrat validé par opération, une politique de conflit et des tests dédiés; il ne suffit pas d’ajouter une valeur `entity`.
