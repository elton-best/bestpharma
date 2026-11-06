# Correction des écrans et de la connexion

## Changements

- Dates manquantes ou invalides : indication explicite plutôt qu’exception de formatage ; aucune date inventée.
- Sélecteur de section : liste absente pendant le chargement tolérée, recherche sécurisée et cible tactile agrandie.
- Recherches : champs textuels absents pris en charge, notamment le nom du client sur une facture et le processus dans l’auto-évaluation.
- Connexion : hauteur minimale adaptable, défilement vertical possible, courriel pouvant revenir à la ligne, champ du code avec autocomplétion et espacement réduit. Les messages hors panneau de démonstration ne suggèrent plus un code fixe.
- Mentions de prestataire de paiement retirées ; suppression du faux secret prérempli et de son formulaire non connecté. Les badges techniques signalés sur la caisse, les stupéfiants et les préparations sont retirés. Les règles métier de conservation, d’audit et de visa ne changent pas.
- Visa de dispensation dans l’aperçu : route ajoutée, jeton et rôle vérifiés, fiche limitée à une officine accessible. Le résultat est un visa de démonstration en mémoire, pas une signature officielle.

## Vérifications

Tests de formatage pour les dates invalides et absentes ; test du sélecteur sans liste ; tests d’ouverture et de recherche sur les principaux écrans à partir de réponses de démonstration enregistrées dans `frontend/src/test/reponses-demo.json` ; test de saisie du code de connexion et d’absence de blocage du défilement.

Ces tests utilisent un environnement DOM simulé : ils ne constituent pas une inspection visuelle sur téléphone réel et ne couvrent pas toutes les actions de toutes les rubriques. Le contrôle HTTP du visa est effectué à travers le proxy de l’aperçu, avec refus sans connexion, refus pour le dispensateur, fiche absente et succès pour le pharmacien.
