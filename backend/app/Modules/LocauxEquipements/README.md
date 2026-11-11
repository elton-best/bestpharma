# Locaux & équipements — registre des températures

Les routes `GET/POST /api/v1/locauxequipements/temperatures`, `GET .../stats` et `POST .../import` utilisent le tenant résolu par `tenant.context`; les accès sont limités à l’administration active de l’officine. Les relevés manuels exigent une date/heure fournie. L’import CSV ne remplit que les champs reconnus et retourne les numéros de lignes rejetées.

`config/temperatures.php` laisse les seuils à `null` : aucune limite réglementaire n’est présumée. Dans cette configuration, un relevé reçoit le statut `a_evaluer`; une excursion aux limites configurées est seulement enregistrée comme telle. Aucun lot n’est mis en quarantaine et aucune analyse de cause n’est attestée.

Validation ciblée prévue : `php artisan test --filter=TemperatureRegisterTest`, `npm test -- --run src/services/__tests__/temperatures-ui.test.ts` et `npm run build` depuis `frontend`. Sur l’environnement de développement observé (PHP 8.3.6, cible Composer PHP 8.4, extension PDO SQLite absente), les tests Laravel échouent avant exécution et le build TypeScript présente une erreur préexistante dans `src/views/ventes-caisse/IndexView.vue` (`replaceAll` absent de la bibliothèque TS ciblée). Ces contraintes n’ont pas été contournées en modifiant les exigences de plateforme.
