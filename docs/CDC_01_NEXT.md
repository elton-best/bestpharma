> **Règles métier actualisées :** [MFA obligatoire, contrôle humain et export du journal](CDC_01_DECISIONS_APPLIQUEES.md). Ces décisions remplacent les réserves correspondantes ci-dessous.

# Après la recette technique du module 01

Le développement local et la recette exécutée sont décrits dans [le procès-verbal courant](CDC_01_RECETTE_FINALE.md), avec 83 tests backend / 453 assertions par moteur, 75 tests frontend, 82 contrôles HTTP et recettes Chromium desktop/mobile.

La prochaine étape est la recette de déploiement et la validation des décisions explicitement ouvertes du CDC, **pas une déclaration automatique de conformité ou de mise en production** :
- SMTP et Google réels, domaines/HTTPS, Redis partagé, scheduler supervisé ;
- pièces/mandat, obligation MFA, perte totale des facteurs, conservation, délégations et assistance exceptionnelle ;
- textes métier/juridiques, politique d’export du journal, sauvegardes et restauration ;
- exécution Docker/CI dans un environnement qui les fournit.

Le module 02 reste séparé et démonstratif. Ne pas exécuter les scripts de recette sur une base métier et ne pas laisser la boîte locale de secrets activée après les essais.
