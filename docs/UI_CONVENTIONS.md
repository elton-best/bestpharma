# Interactions BestPharma : actions en modale

## Exigence utilisateur
Les actions Ajouter, Voir/Consulter, Modifier, Inviter et Confirmer doivent s’ouvrir dans une modale, pas dans un formulaire ajouté au bas de la page. Cette règle s’applique également aux nouveaux écrans.

Les pages de navigation, listes, tableaux de bord, connexion et inscription restent des pages dédiées. Les filtres et recherches restent dans les listes.

## Composant commun
Utiliser `frontend/src/components/AppModal.vue` :

```vue
<AppModal v-model="open" title="Nouvelle entrée" :busy="saving">
  <form @submit.prevent="save">
    <div class="form-body">
      <!-- champs et erreurs contextuelles -->
    </div>
    <div class="modal-footer">
      <button type="button" :disabled="saving" @click="open = false">Annuler</button>
      <button type="submit" :disabled="saving">Enregistrer</button>
    </div>
  </form>
</AppModal>
```

- `title` obligatoire, `eyebrow` facultatif.
- Tailles `normal`, `wide`, `small` pour formulaires, dossiers et confirmations.
- Téléportation dans `body`, en dehors de la racine de l’application.
- Fond de l’application `inert`, défilement du fond bloqué, contenu long défilable.
- Dialogue nommé (`role=dialog`, `aria-modal`, `aria-labelledby`).
- Focus initial, boucle Tab/Maj+Tab, retour au déclencheur à la fermeture.
- Fermeture par croix, Échap ou clic sur le fond, sauf pendant un enregistrement (`busy`).
- Nettoyage au démontage pour ne pas conserver le verrouillage après navigation.
- Préférer remplacer une modale par la suivante (ex. Voir → Modifier), sans imbriquer les formulaires.
- Les erreurs de validation et réseau restent dans la modale ouverte. Ne fermer qu’après réussite de l’action.
- Aucun `window.confirm`, `window.alert` ou `window.prompt` dans les parcours métier.

## Écrans harmonisés
- Qualité : création, détail et modification d’une action.
- Équipe : lecture seule d’un membre, rôle ou invitation ; édition d’un membre ; création/édition d’un rôle ; création d’invitation ; affichage unique du lien.
- Invitations : confirmation de révocation.
- BEG : consultation de dossier et décision dans le même dialogue.
- Suivi demandeur : correction et nouvelle soumission dans une modale.
- Démonstration : confirmations de réinitialisation qualité et équipe.

## Vérification
42 tests frontend passent (Vitest/jsdom), dont 7 tests du composant, parcours Voir → Modifier, confirmation de révocation et consultation BEG. Build TypeScript + Vite réussi. Cela ne remplace pas une vérification graphique et lecteur d’écran dans un navigateur réel.

Les garanties serveur et les permissions ne changent pas avec cette refonte visuelle. L’aperçu reste fictif, les tests backend demeurent à exécuter avec PHP/Composer.


## Navigation commune (tranche M01/M02)
Structure et interactions inspirées du layout ERPSAAS : sidebar blanche, accordéons, hiérarchie indentée, état actif bleu ciel exact (y compris query des onglets), réduction aux icônes persistée et drawer mobile. Les couleurs sont centralisées par la surcharge assets/erp.css ; les trois familles typographiques BestPharma sont conservées. Recherche d’espace en modale. Les modules futurs restent navigables vers un état « à venir » explicite, jamais redirigés silencieusement vers le dashboard.
