# Guide national des bonnes pratiques de dispensation

## Provenance

Le PDF `guide-bpdisp.pdf` est la copie fournie par l’utilisateur dans la conversation le 6 novembre 2026 sous le nom `Bonnes Pratiques de Dispensation (BPDisp).pdf`. Il n’a pas été téléchargé depuis un site de l’ABMed ni authentifié auprès de l’autorité.

La première page porte la décision **ABMED/2025D/1310/ABMed/CJ/DIRP/SA du 26/02/2025**. Le fichier contient 28 pages PDF (la pagination imprimée est différente). Son empreinte SHA-256 est conservée dans le rapport d’extraction.

## Extraction, pas encore validation métier

`extraction/articles-a-relire.json` contient les segments de texte extraits pour les articles, leur chapitre et les pages PDF où les retrouver. Tous ont le statut `a_relire`. Aucune évaluation de campagne ni donnée pilote n’est modifiée.

| Chapitre | Articles repérés |
|---|---:|
| 1 | 31 |
| 2 | 21 |
| 3 | 31 |
| 4 | 38 |
| 5 | 27 |
| 6 | 17 |
| 7 | 75 |
| 8 | 13 |
| 9 | 5 |
| 10 | 9 |
| Total | 267 |

Le contrôle vérifie la séquence complète, l’absence de répétition, la présence de texte et la reproductibilité par rapport au PDF. Il ne valide ni le sens juridique ni la qualité typographique de l’extraction.

### Reproduction

Avec Python dans un environnement virtuel :

```sh
pip install -r scripts/requirements-referentiel.txt
python scripts/extraire-referentiel-abmed.py
python scripts/extraire-referentiel-abmed.py --check
```

Le script n’enlève que les lignes vides et les numéros de page isolés. Des titres de section ou principes non numérotés peuvent figurer à la fin des segments ; des espaces internes aux mots peuvent provenir du PDF. Ils sont conservés pour ne pas modifier silencieusement le sens du texte. La relecture doit les séparer en contexte documentaire et texte de l’exigence, en gardant la source brute.

## Conditions avant mise en service

- Relire les libellés et sous-listes sur les pages PDF avec un pharmacien/RMQ ; consigner auteur, date, modifications et version validée.
- Ne pas simplement compléter l’ancienne liste : les anciens résumés ne correspondent pas toujours aux mêmes numéros officiels. Par exemple, l’ancien article `2.18` parle de suivi médical ; le guide fourni traite à cet endroit de l’enregistrement des formations.
- Versionner le référentiel. Ne pas rattacher automatiquement les anciennes cotations/CAPA aux nouveaux libellés, même lorsque le numéro est identique.
- Tester l’import sur une base de recette, son idempotence, le total par chapitre et la conservation des historiques.
- Calculer les compteurs depuis la version effectivement importée, sans assimiler couverture documentaire et conformité de l’officine.

La signature serveur et la chaîne d’audit réelle constituent un lot distinct, encore à réaliser. Cette extraction ne vaut pas certification du logiciel.

## Préparation en base Laravel (sans activation)

Après application des migrations, depuis `backend/` :

```sh
php artisan bpd:preparer ../references/abmed/extraction/articles-a-relire.json ../references/abmed/guide-bpdisp.pdf --verifier
php artisan bpd:preparer ../references/abmed/extraction/articles-a-relire.json ../references/abmed/guide-bpdisp.pdf
```

La première commande n’écrit rien. La seconde enregistre un instantané au statut `a_relire` dans `versions_referentiel_bpd`, identifié par le SHA-256 du fichier JSON. Répéter la commande avec le même fichier ne crée pas de doublon et ne met pas à jour l’instantané. Toute modification du fichier produit une autre identité. Ce mécanisme n’est ni une signature, ni un horodatage opposable, ni une protection contre un administrateur de base malveillant.

Les campagnes historiques conservent leurs articles, cotations et liens CAPA ; leur nouvelle colonne `referentiel_version_id` reste NULL, ce qui signifie ancien référentiel non rapproché. Le service de campagne courant n’active pas les instantanés en relecture. Il n’existe à ce stade aucune commande de validation/activation : elle devra enregistrer la relecture métier et créer de nouvelles campagnes sans recopier de scores.

### Vérifications effectuées

- Contrôle reproductible Python de l’extraction : réussi.
- Analyse syntaxique PHP des nouveaux fichiers : réussie avec PHP WebAssembly.
- Exécution PHP du vérificateur pur : source complète acceptée ; PDF différent, numéro dupliqué, texte vide et statut de validation injustifié refusés.
- Tests PHPUnit écrits pour ces cas, ainsi qu’un test d’import répété et de conservation des campagnes et évaluations. Le test d’intégration et la migration PostgreSQL restent à exécuter dans la CI ; ils ne sont pas déclarés réussis localement.
