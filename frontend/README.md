# BestPharma — Interface officine

Vue 3, TypeScript, Vite, Pinia, PrimeVue et Tailwind.

```bash
npm ci
npm run dev -- --port 3000
npm test
npm run build
```

Mode par défaut : démonstration avec données fictives dans localStorage, sans appel API.
Ne pas saisir de données personnelles ou de santé. Le bouton Réinitialiser restaure les exemples.

Pour connecter Laravel : `.env.local` avec `VITE_DATA_MODE=api` et `API_PROXY_TARGET=http://127.0.0.1:8000`, puis redémarrer Vite. Le navigateur appelle uniquement des URL relatives. Token temporaire dans sessionStorage, expiration côté serveur après 8h. Sécurisation déploiement (HTTPS, CSP, audit) à réaliser avant production.

Routes : `/dashboard`, `/qualite`, `/documents`, `/login`, `/register`, `/application`, `/beg/inscriptions`.

Le parcours d’ouverture peut être simulé de bout en bout avec des informations fictives. Aucun mot de passe n’est sauvegardé en mode démonstration. Le suivi ne crée pas d’accès métier réel. En mode API, l’instruction est autorisée uniquement côté serveur pour un administrateur plateforme.

Polices : Manrope 400/500/600/700, Bricolage Grotesque 500/700/800 (opsz 12–96), Instrument Serif italique via `.accent-serif`. Les polices Google nécessitent un accès internet dans le navigateur ; des fallbacks système sont définis.

Les documents de l’ERP ne sont pas les modèles BestPharma. Les supports réels seront intégrés après réception.


## Équipe & droits
`/equipe` : membres, rôles locaux personnalisés, multi-rôles, suspension, invitations manuelles. `/invitation#token=…` : acceptation du lien. Aucun e-mail automatique. En API, compte existant : se connecter via le lien prévu, puis accepter ; nouveau compte : créer son accès au moment de l’acceptation. Voir `../docs/TEAM_ACCESS.md` pour les limites et garanties à tester avant production.
