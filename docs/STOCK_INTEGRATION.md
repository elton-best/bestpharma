> **Mise à jour :** la connexion serveur de première tranche est désormais implémentée et testée. Voir [STOCK_API.md](STOCK_API.md), qui remplace les mentions historiques « backend non raccordé » ci-dessous pour le périmètre décrit. Les autres réserves de complétude métier demeurent.

# Stock — intégration des 13 rubriques

## État et source

Cette tranche implémente **l’interface complète des 13 entrées de navigation et des parcours locaux de démonstration**, pas un module Stock de production complet. Référence : `CDC_General_Socle.md`, sections 5 (dépendances catalogue/réceptions), 7.3 (opérations et rectification), 8 (droits/traçabilité), exigences d’intégrité/concurrence et critères pharmacie. Aucun CDC Stock détaillé n’a encore été fourni dans `docs/cdc/`.

Les URL `/dashboard/stock?tab=…` demandées sont conservées. Elles ne pointent plus vers le module générique « À venir ». Le menu utilise les mêmes intitulés. Toutes les créations, consultations et validations métier sont en modales. Les filtres, la pagination et les liens de navigation restent sur la page.

## Couverture UI / démonstration

| Rubrique | Parcours disponible |
|---|---|
| Vue d’ensemble | Produits, quantités physiques/disponibles, échéances ≤90 jours, valeur brute indicative, lots à surveiller |
| Produits | Liste, recherche, détail, création avec code unique, unité et seuil d’alerte indicatif |
| Lots | Produit, numéro de lot, date exacte, emplacement, quantité et état ; détail et actions |
| FEFO | Tri par produit puis échéance ; lots vides, bloqués ou à échéance atteinte exclus ; aucune dispensation déclenchée |
| Emplacements | Liste, création, quantité physique et valeur brute par emplacement |
| Mouvements | Traces locales horodatées et motivées ; transfert entre emplacements, contrôle du disponible |
| Réception | Produit/lot/date/quantité/coût/référence ; entrée en quarantaine ; événement associé |
| Scan | Recherche exacte par code via saisie ou lecteur clavier, détail produit ; aucun produit créé pour un code inconnu |
| Inventaires | Comptage lot/emplacement, contrôle du stock attendu et trace de l’écart ; historique antérieur conservé |
| Péremptions | Lots à échéance atteinte et lots dans l’horizon indicatif de 90 jours |
| Quarantaine & Rappels | Mise en quarantaine, rappel interne simulé sur toutes les lignes du même produit/lot, levée de quarantaine motivée si non périmé |
| Déchets | Sortie quantifiée et motivée conservant le lot et l’historique ; pas de certificat de destruction |
| Valorisation | Quantité × coût unitaire de réception, brut/disponible/bloqué par produit ; pas de comptabilisation |

Les données utilisent des produits génériques fictifs, sans conseil thérapeutique ni données patient. Le même stock fictif de départ est proposé dans chaque officine, mais ses modifications sont stockées sous une clé distincte par officine. La restauration est confirmée en modale et ne touche pas les autres modules/officines.

## Règles de démonstration — à confirmer pour le serveur

- Quantités entières positives pour réceptions/transferts/déchets, comptage entier non négatif. Pas de stock négatif.
- Date exacte obligatoire. Pour rester conservateur, un lot dont l’échéance est aujourd’hui est déjà bloqué. L’interprétation des péremptions mois/année doit être validée avant exploitation.
- Réception refusée pour une échéance atteinte ; toute réception entre en quarantaine. Réception complémentaire d’un numéro de lot existant non disponible dans cette tranche.
- Transfert autorisé uniquement pour un lot disponible non périmé et dans la quantité disponible. Quantité physique et valeur totale inchangées.
- Rappel/quarantaine appliqués à toutes les lignes locales du même produit et numéro de lot. Un rappel ne peut pas être levé ni rétrogradé en quarantaine par ce parcours.
- Écart d’inventaire = quantité observée moins quantité attendue ; il produit une nouvelle trace, sans modifier les événements antérieurs.
- Le registre déchets indique une sortie du stock ; il ne prouve ni enlèvement ni destruction physique.
- Coûts fictifs entiers en FCFA et valorisation brute indicative, **pas** de méthode CUMP/FIFO comptable, marge, taxe ou dépréciation approuvée.
- Détection élémentaire des révisions périmées entre fenêtres. `localStorage` n’est ni une transaction multiutilisateur, ni une autorisation, ni un journal probant. Les traces peuvent être altérées par le navigateur ; elles ne doivent pas servir à une activité réelle.

## Mode API : pas de substitution fictive

En mode API, la route affiche explicitement « connexion serveur à réaliser ». Elle ne charge ni ne présente de stock fictif comme donnée serveur. Aucun endpoint, migration ou permission Stock n’est livré par cette tranche. Les garanties des modules M1/M2 ne sont pas étendues implicitement au Stock.

## Recette

- **105 tests frontend / 22 fichiers** : régression complète, dont 13 tests de règles Stock et 4 tests UI couvrant les 13 rubriques, la création confirmée en modale, la recherche scanner et l’absence de données fictives en mode API.
- Build TypeScript/Vite validé à l’intégration ; à rejouer après toute modification.
- Aucun test de concurrence serveur, scanner physique/caméra, rappel externe, comptabilité ou parcours de dispensation revendiqué.

Ouvrir l’aperçu **BestPharma — démonstration (port 3000)**, menu Stock, ou `/dashboard/stock?tab=overview`. Le port 3001 est l’application API et signale honnêtement la connexion Stock manquante.

## Étapes nécessaires avant de qualifier le Stock de complet

1. Valider le CDC détaillé : catalogue/unités et conditionnements, fournisseurs/commandes, réceptions partielles et complémentaires, règles de date/FEFO, rôles et séparation des validations.
2. Implémenter registre PostgreSQL multi-officine, permissions serveur, contraintes, transactions/verrous, clés de rejeu, contrepassations et tests de concurrence. Réutiliser le socle d’authentification/MFA sans accorder automatiquement le Stock à BEG.
3. Relier achats, ventes/dispensation/réservations et retours ; définir les preuves de contrôle et la gestion des écarts.
4. Formaliser rappels, lots impactés, blocage immédiat, suivi et preuves ; déchets/filières/prestataires et certificats ; ne pas assimiler une action UI à une démarche réglementaire accomplie.
5. Valider la méthode de valorisation, les exports et rapprochements ; définir GS1/DataMatrix, sérialisation et appareils cibles avant de promettre un scan métier complet.
6. Recette métier avec pharmaciens habilités, tests réels de scanners, récupération/sauvegarde et déploiement. Ne pas utiliser cette démonstration pour le stock réel.


## Correction UX demandée : pages autonomes, sans barre répétée

La barre horizontale « Vue d’ensemble / Produits / Lots / … » est **supprimée de toutes les pages Stock**, y compris en mode API. La navigation principale reste dans le menu latéral ; les URL existantes sont préservées. Les pages partagent le même état local, mais pas le même tableau de bord :

- Vue d’ensemble : disponibilité en valeur, priorités de contrôle et activité récente.
- Produits : catalogue avec indicateurs références/seuil/disponibilité.
- Lots : traçabilité, indicateurs des lignes disponibles et bloquées.
- FEFO : cartes de produits et files ordonnées de lots, sans tableau générique.
- Emplacements : cartographie par cartes de zones, quantités et lots consultables.
- Mouvements : journal et indicateurs de transferts/corrections.
- Réception : circuit bordereau → quarantaine → contrôle et historique des entrées.
- Scan : poste de recherche de code, sans indicateurs globaux non pertinents.
- Inventaires : poste de comptage avec accès direct en modale et historique des écarts.
- Péremptions : calendrier chronologique et horizon 0/30/90/180 jours, sans tableau générique.
- Quarantaine & Rappels : deux files de contrôle distinctes, consultation des lots en modale.
- Déchets : préparation des sorties depuis les lots bloqués et historique quantifié.
- Valorisation : répartition disponible/bloqué, exposition par catégorie exclusive et détail produit.

Les indicateurs sont spécifiques à chaque page. La valeur périmée n’est pas comptée une seconde fois dans la valeur de quarantaine/rappel sur le panneau de répartition.

**Recette actualisée : 107 tests frontend / 22 fichiers**, build réussi. Chromium local réel : les 13 URL sont parcourues, aucune barre répétée, files FEFO, colonnes de rappel, détail de lot en modale et cartes d’emplacement en viewport mobile 390 px ; **zéro erreur JavaScript**. Script de reproduction en lecture seule : `scripts/browser/stock.cjs` (`npm run test:stock`). Il ne réinitialise ni ne modifie les stocks partagés.

Cette correction UX ne raccorde pas le registre Stock à Laravel. Les étapes serveur et validations métier listées plus haut restent nécessaires avant de déclarer le module complet pour l’exploitation.
