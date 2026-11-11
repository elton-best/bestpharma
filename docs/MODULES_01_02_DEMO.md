# État prioritaire — module 01 connecté au serveur

Le module 01 dispose désormais d’API et d’écrans connectés pour profils, fiche officine, contacts, sélecteur d’officine, propositions/approbations/retraits d’accompagnateurs et historique. **43 tests backend / 201 assertions** passent sur SQLite et PostgreSQL, **67 tests frontend** passent, **33 contrôles HTTP** et **9 contrôles Chromium API** réussissent. Le module 02 reste en démonstration locale. Cette intégration n’est pas encore la couverture exhaustive du CDC module 01.

Guide actuel et reste à livrer : [MODULE_01_API.md](MODULE_01_API.md). Les sections suivantes sont l’historique de la tranche précédente et leurs réserves M01 « non connecté » ne décrivent plus l’état actuel.

---

# Navigation ERPSAAS et modules 01/02 — tranche interactive

10 novembre 2026. Sources reçues, conservées sans modification dans `docs/cdc/` :
- `CDC_DIGIT_ABMEB_Module_01_Officines_Acces.md` (v1.1)
- `CDC_DIGIT_ABMEB_Module_02_Accompagnement_Officines.md` (v1.0, propositions métier à valider)

Le produit reste **BestPharma / BEGPHARMA**. Le nom DIGIT ABMEB des fichiers source n’implique pas un changement de marque. L’exploitant est distinct de l’ABMed. Aucun accès officiel du régulateur ni certification n’est présumé.

## Navigation et design

La structure reprend le layout `frontend/src/layouts/DefaultLayout.vue` d’ERPSAAS : sidebar blanche compacte, arborescence accordéon, repère actif bleu ciel, sous-items indentés, réduction desktop aux icônes, préférence locale conservée et drawer mobile. Les polices BestPharma demandées restent Manrope, Bricolage Grotesque et Instrument Serif italique.

Les neuf groupes sont présents : Pilotage ; Comptoir & Caisse ; Stock ; Stupéfiants & Préparations ; Documents & Canevas ; Qualité & BPD ABMed ; Gestion & Finance ; Accompagnement des officines ; Compte & Officine. Le groupe Pilotage contient Tableau de bord, Consolidation Groupe et Pharmacies de Garde. Les 13 liens Stock conservent une URL distincte par onglet, y compris Valorisation.

Les rubriques non livrées ouvrent une page explicite « à venir », pas un faux écran métier. Les libellés 59 modèles, 267 articles, Tab. B, SYSCOHADA et journal SHA-256 sont des intitulés de cible fournis, pas des fonctionnalités ni un inventaire de documents attesté. Recherche de navigation en modale.

## Données de démonstration

**Aperçu local, port 3000** ; `VITE_DATA_MODE` différent de `api`.

- 3 officines fictives : Palmiers (Porto-Novo), Lagune (Cotonou), Plateau (Abomey-Calavi, en attente).
- 3 demandes : convertie, compléments demandés, soumise.
- 3 missions : en cours, proposée, acceptée.
- Accompagnateurs approuvés et à approuver, diagnostic fictif sans barème, intervention confirmée, livrable textuel et échange partagé.
- Périodes des exemples relatives à la première création du jeu local, afin de garder une intervention à venir.
- Stockage isolé `bestpharma.demo.modules12.v1`. Restauration en modale, sans effacer l’équipe, la qualité ou les inscriptions antérieures.
- Le sélecteur d’officine et le sélecteur de point de vue ne s’appliquent qu’à cette nouvelle démo M01/M02. Ils **ne constituent jamais une barrière de sécurité**. Le tableau de bord initial présente explicitement le portefeuille fictif global.
- Les anciennes démos Équipe/Qualité/Inscription restent indépendantes, signalé dans la fiche. Aucune invitation réelle, email ou mot de passe stocké dans le nouveau jeu.
- Instruction BEG : bouton **Charger des dossiers fictifs**, confirmation en modale, ajoute trois dossiers sans écraser les demandes existantes ni dupliquer les exemples.

## Essayer en quelques minutes

1. Tableau de bord : replier la sidebar, la déplier, ouvrir Stock → Valorisation pour voir le traitement d’un module futur.
2. Compte & Officine → Paramètres Officine : consulter les onglets, modifier la fiche dans la modale.
3. Accompagnateurs : ouvrir Morgan Exemple ; approuver ou refuser avec motif. Retirer un accès approuvé conserve son historique.
4. Mon accompagnement : ouvrir la mission proposée, consulter objectifs et période, l’accepter en modale.
5. Fermer, choisir le point de vue **Coordination entreprise**, rouvrir la mission et démarrer. Le responsable doit avoir une affectation approuvée, de bonne portée et dans sa période.
6. Ouvrir la mission en cours : onglets Diagnostic, Visites, Livrables, Échanges et Historique.
7. Reporter une visite en modale : l’ancienne occurrence reste « Reportée », la nouvelle est « Proposée ». Repasser en vue officine pour la confirmer.
8. En vue officine, créer une demande, enregistrer un brouillon incomplet, le rouvrir et le compléter avant soumission. La coordination peut qualifier, demander des précisions, refuser avec motif ou créer un brouillon de mission lié.
9. Pour une mission en cours, passer en bilan côté coordination ; rédiger le bilan et la décision sur les actions ouvertes, puis clôturer. Aucun accès accompagnateur n’est retiré automatiquement.
10. Changer d’officine : les listes officine se limitent à sa sélection. La coordination simule un portefeuille transversal et signale ce périmètre.

## Couverture et limites par rapport aux CDC

| Sujet | Cette tranche | Reste à livrer / valider |
|---|---|---|
| Inscription, instruction, équipe, rôles | API précédente réellement testée + interfaces en modales ; exemples de dossiers ajoutables | Alignement intégral CDC v1.1 : brouillons d’inscription, champs enrichis, vérification email, Google, notifications, version explicite des dossiers |
| Fiche officine | Consultation, contacts, historique, édition locale en modale | API enrichie, contacts multiples, états suspendue/archivée, preuves privées, annulation avec avertissement de saisie |
| Accompagnateurs | Proposition entreprise ; décision officine ; retrait motivé ; portée/période ; contrôle au démarrage | Tables/API/permissions effectives et contrôles directs serveur, expiration configurable, révocation de sessions et réapprobation de portée |
| Missions et demandes | Listes, filtres, recherche, pagination, brouillons, transitions, raisons et historique locaux | API transactionnelle, idempotence/concurrence serveur, outbox, périmètres réels et recette complète du CDC |
| Diagnostic | Grille fictive v1 ; non évalué distinct ; justification non applicable ; partage figé | Catalogue validé, vraies versions, comparaison et preuves privées |
| Visites | Proposition, confirmation officine, report historisé, annulation et compte rendu fictif | Agenda complet, participants, conflits, versions de rapports et notifications |
| Livrables | Contenus textuels partagés, acceptation/refus motivé | GED module 03, fichiers privés, versions immuables et téléchargements contrôlés |
| Plan & actions | Point d’intégration explicite vers le suivi qualité existant, sans duplication | Moteur transversal module 04, plan versionné et liens autorisés |
| Bilan | Synthèse et décision explicite requises avant clôture locale | Versions figées et workflow d’approbation métier final |
| Notes internes | Non implémentées, donc jamais mélangées aux messages partagés | Stockage et filtrage serveur strict avant introduction |

**Ce n’est pas la livraison exhaustive des deux CDC.** Cette tranche fournit la navigation cible et une démonstration interactive pour valider l’ergonomie et les choix métier avant les nouvelles API.

## Séparation API / démo

L’aperçu connecté à PostgreSQL (port 3001) conserve le backend déjà validé. Les nouveaux écrans M01/M02 y affichent « non connecté » au lieu de charger silencieusement des exemples. Le dashboard API conserve les indicateurs qualité de la session réelle. Les transitions de la nouvelle démo refusent le mode API avant mutation.

Aucune modification de Supabase ni de schéma serveur pour cette tranche. Aucun faux OAuth/MFA, email « envoyé », score réglementaire ou modèle officiel.

## Vérifications

- **61 tests frontend / 13 fichiers réussis**, dont 19 nouveaux tests (navigation, transitions, portée, versions, formulaire brouillon, bilan, modales Teleport et absence de repli démo en API).
- TypeScript + build Vite réussis.
- Smoke test réel **Chromium headless desktop + mobile** : tableau de bord prérempli, réduction sidebar persistante, onglet Valorisation, approbation en modales imbriquées, acceptation/démarrage mission, report de visite avec ancienne occurrence conservée, demande créée puis relue après navigation, filtrage par officine, drawer mobile et absence d’erreur JavaScript. 11 contrôles réussis. Ce smoke ne remplace pas la recette exhaustive ni un audit lecteur d’écran.
- Backend non modifié dans cette tranche ; précédent bilan : 29 tests / 120 assertions sur SQLite et PostgreSQL + 41 contrôles HTTP. Ces chiffres ne valident **pas** les nouvelles fonctions M01/M02 côté serveur, qui n’existent pas encore.
