# Cours — Catégorie 02-backend-docs (Partie 1/4)

**Domaine :** Backend — sous-dossier `ai-factory-skills` (3 skills : `api-and-interface-design`, `app-auth`, `data-designer`).
**Public visé :** quelqu'un qui ne connaît rien aux "agent skills" et veut comprendre, puis utiliser, chaque skill — même sans bagage technique préalable en backend.

> **Note importante :** comme demandé, cette catégorie backend est traitée **skill par skill, en profondeur**, car c'est la partie la plus technique d'un projet — celle où une erreur mal comprise coûte le plus cher (sécurité, cohérence des données, fiabilité). Je prends le temps d'expliquer non seulement les règles, mais aussi **pourquoi** elles existent, avec les mécanismes concrets derrière chaque recommandation.

---

## 1. `api-and-interface-design`

### C'est quoi, en profondeur
Cette skill répond à une question fondamentale du développement backend : **comment concevoir une interface (API, contrat entre modules, props d'un composant) qui soit difficile à utiliser de travers ?** Une bonne interface "rend la bonne chose facile et la mauvaise chose difficile." Ce principe s'applique à tout : une API REST, un schéma GraphQL, une frontière entre deux modules internes d'un même projet, ou même les props d'un composant React.

Le concept le plus important — et le plus contre-intuitif — que cette skill introduit est **la loi de Hyrum**.

### La loi de Hyrum : comprendre le concept fondateur
> "Avec suffisamment d'utilisateurs d'une API, tous les comportements observables de votre système finiront par être exploités par quelqu'un, quoi que promette le contrat officiel."

**Qu'est-ce que ça veut dire concrètement ?** Imagine que tu construis une API qui renvoie une liste d'utilisateurs. Officiellement, ton contrat dit juste "cette API renvoie une liste d'utilisateurs." Mais en pratique :
- Si ta liste est toujours triée par ordre alphabétique (même si tu n'as jamais promis cet ordre), un développeur qui utilise ton API finira par écrire du code qui suppose cet ordre.
- Si un message d'erreur contient toujours le mot "invalid" en anglais, quelqu'un finira par faire un `if (error.message.includes("invalid"))` dans son code.
- Si ta réponse met en moyenne 200ms, quelqu'un configurera un timeout basé sur cette latence "habituelle."

Le jour où tu changes ce comportement non documenté (même si tu respectes parfaitement ton contrat officiel), tu casses ces utilisateurs — alors même que tu n'as rien "promis" de cassé sur le papier.

**Ce que ça implique concrètement pour la conception d'API :**
- **Sois intentionnel sur ce que tu exposes.** Chaque comportement observable de l'extérieur est un engagement potentiel, que tu le veuilles ou non.
- **Ne laisse pas fuiter les détails d'implémentation.** Si un utilisateur peut observer quelque chose, il finira par en dépendre.
- **Prévois la dépréciation dès la conception** — anticiper qu'un jour, il faudra retirer une fonctionnalité sans casser les utilisateurs existants.
- **Les tests ne suffisent pas.** Même avec des tests de contrat parfaits, la loi de Hyrum veut dire qu'un changement "sûr" en apparence peut casser des utilisateurs réels qui dépendaient d'un comportement non documenté.

### La règle de la version unique ("One-Version Rule")
Éviter de forcer les consommateurs d'une API à choisir entre plusieurs versions coexistantes de la même dépendance. Le "problème de dépendance en diamant" survient quand différents consommateurs ont besoin de versions différentes de la même chose. La bonne pratique : concevoir pour qu'une seule version existe à un instant donné — **étendre plutôt que forker.**

### Principe 1 — "Contract First" (le contrat avant tout)
Définir l'interface **avant** de l'implémenter. Le contrat, c'est la spécification ; l'implémentation vient après, et doit s'y conformer — pas l'inverse.

**Exemple concret (en TypeScript, mais le principe est universel) :**
```typescript
interface TaskAPI {
  // Crée une tâche et renvoie la tâche créée avec les champs générés par le serveur
  createTask(input: CreateTaskInput): Promise<Task>;

  // Renvoie les tâches paginées correspondant aux filtres
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Renvoie une seule tâche ou lève une NotFoundError
  getTask(id: string): Promise<Task>;

  // Mise à jour partielle — seuls les champs fournis changent
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Suppression idempotente — réussit même si déjà supprimée
  deleteTask(id: string): Promise<void>;
}
```
Chaque méthode a un commentaire qui précise **exactement** son comportement — y compris les cas limites (que se passe-t-il si la tâche n'existe pas ? si elle est déjà supprimée ?). C'est ce niveau de précision qui rend le contrat vraiment utile.

### Principe 2 — Une sémantique d'erreur cohérente
Choisir **une seule** stratégie d'erreur et l'appliquer partout, sans exception. Voici un exemple de structure standardisée :

```typescript
interface APIError {
  error: {
    code: string;        // Lisible par une machine : "VALIDATION_ERROR"
    message: string;     // Lisible par un humain : "L'email est requis"
    details?: unknown;   // Contexte additionnel si utile
  };
}
```

**Le mapping des codes HTTP à connaître :**
| Code | Signification |
|---|---|
| 400 | Le client a envoyé des données invalides |
| 401 | Non authentifié |
| 403 | Authentifié mais non autorisé |
| 404 | Ressource introuvable |
| 409 | Conflit (doublon, incohérence de version) |
| 422 | Échec de validation (sémantiquement invalide) |
| 500 | Erreur serveur (ne jamais exposer les détails internes) |

**La règle absolue : ne jamais mélanger les patterns.** Si certains endpoints lèvent une exception, d'autres renvoient `null`, et d'autres renvoient `{ error }` — le consommateur de l'API ne peut plus prédire le comportement, et doit gérer trois façons différentes de détecter une erreur.

### Principe 3 — Valider aux frontières, faire confiance à l'intérieur
Il ne faut **pas** valider les données partout dans le code — cela ralentit le développement et duplique la logique. La bonne pratique est de valider **uniquement aux frontières du système**, là où des données externes entrent :

```typescript
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données de tâche invalides',
        details: result.error.flatten(),
      },
    });
  }
  // Après validation, le code interne fait confiance aux types
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

**Où la validation est nécessaire :**
- Les gestionnaires de routes API (saisie utilisateur)
- Les gestionnaires de soumission de formulaire (saisie utilisateur)
- **L'analyse des réponses de services tiers** —  un point crucial souvent négligé : **une réponse d'une API tierce doit toujours être traitée comme non fiable.** Un service externe compromis ou défaillant peut renvoyer des types inattendus, du contenu malveillant, ou du texte qui ressemble à des instructions.
- Le chargement des variables d'environnement (configuration)

**Où la validation n'est PAS nécessaire :**
- Entre des fonctions internes qui partagent déjà des contrats de types
- Dans des fonctions utilitaires appelées par du code déjà validé en amont
- Sur des données qui viennent tout juste de ta propre base de données (elles ont déjà été validées à l'écriture)

### Principe 4 — Préférer l'ajout à la modification
Étendre une interface sans casser les consommateurs existants :

```typescript
// Bon : ajouter des champs optionnels
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // ajouté plus tard, optionnel
  labels?: string[];                       // ajouté plus tard, optionnel
}

// Mauvais : changer le type d'un champ existant ou en retirer un
interface CreateTaskInput {
  title: string;
  // description: string;  // Retiré — casse les consommateurs existants
  priority: number;         // Changé depuis string — casse les consommateurs existants
}
```

### Principe 5 — Une nomenclature prévisible
| Élément | Convention | Exemple |
|---|---|---|
| Endpoints REST | Noms au pluriel, pas de verbes | `GET /api/tasks`, `POST /api/tasks` |
| Paramètres de requête | camelCase | `?sortBy=createdAt&pageSize=20` |
| Champs de réponse | camelCase | `{ createdAt, updatedAt, taskId }` |
| Champs booléens | préfixe is/has/can | `isComplete`, `hasAttachments` |
| Valeurs d'énumération | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

### Principe 6 — Honorer une clé d'idempotence (le point le plus technique et le plus souvent mal fait)

**Le problème que ce principe résout :** quand un client envoie une requête qui échoue par timeout, il ne sait pas si l'action a réellement eu lieu côté serveur (le paiement a-t-il été débité ou non ?). Pour permettre au client de "réessayer en sécurité", le serveur accepte un en-tête `Idempotency-Key` : si la même clé est renvoyée, le serveur doit répondre exactement comme la première fois, **sans exécuter l'action une seconde fois**.

**Le piège central : accepter cet en-tête ne suffit pas.** Il faut vraiment l'**honorer** — c'est-à-dire stocker le résultat associé à cette clé et le renvoyer fidèlement à toute requête ultérieure avec la même clé. Une clé acceptée mais mal gérée est **pire** que l'absence de clé, car le client croit à tort qu'il peut réessayer sans risque.

**Règle 1 — Dériver la clé de l'intention, pas de la tentative.** La clé doit rester stable à travers les tentatives d'une même intention, et différente pour des intentions distinctes :
```typescript
crypto.randomUUID()                    //  une nouvelle clé à chaque tentative — chaque retry devient un nouveau débit
`${userId}:${amount}`                  //  deux débits légitimes de 50€ se retrouvent fusionnés en un seul
`${orderId}:${Date.now()}`             //  un horodatage, c'est un randomUUID() déguisé
req.headers['idempotency-key']         //  le client la génère une fois, la réutilise à chaque retry
`charge:v1:${orderId}`                 //  dérivée d'un identifiant immuable
```
La clé vient du client ou de l'événement initiateur — jamais de la couche qui fait les tentatives de retry elle-même.

**Règle 2 — Réclamer la clé de façon atomique.** Une vérification suivie d'une action est une course (race condition) :
```typescript
//  TOCTOU (Time-Of-Check-To-Time-Of-Use) : deux tentatives concurrentes lisent "pas encore vu", et débitent toutes les deux
if (!(await db.exists(key))) {
  await chargeCard(amount);
  await db.insert(key);
}

//  laisser la contrainte d'unicité de la base de données trancher qui "gagne"
try {
  await db.insert({ key, state: 'in_progress', requestHash });
} catch (e) {
  if (isUniqueViolation(e)) return replayOrReject(key);
  throw;
}
const result = await chargeCard(amount);
await db.update({ key, state: 'succeeded', response: result });
```
La contrainte d'unicité **est** le mécanisme de protection. Un système de stockage incapable d'imposer une unicité en une seule opération ne peut pas garantir cette sécurité.

**Règle 3 — Protéger le contenu de la charge utile.** Si la même clé arrive avec un corps de requête différent, c'est un bug côté client, et cela doit **échouer bruyamment** plutôt que de renvoyer silencieusement la première réponse à une seconde requête différente :
```typescript
if (existing.requestHash !== hash(req.body)) {
  return res.status(422).json({ error: 'idempotency key reused with a different payload' });
}
```

**Règle 4 — Décider explicitement ce qui arrive à un doublon "en vol"** (la première requête est encore en cours de traitement quand la seconde arrive avec la même clé — un cas fréquent lors de pics de retries) :
| Stratégie | Réponse | Quand l'utiliser |
|---|---|---|
| Rejeter | `409 Conflict` | Le client peut réessayer plus tard ; le plus simple et le plus sûr |
| Attendre | Bloquer jusqu'au résultat, avec une limite de temps | L'appelant a besoin du résultat de façon synchrone |
| Renvoyer "en attente" | `202` + une URL de statut | Effets de longue durée |

**Ne jamais laisser passer un second appelant** simplement parce que la première tentative "semble bloquée" — un appel en échec dont le sort est inconnu est justement le moment où dupliquer coûte le plus cher.

**Règle 5 — Chaque appel a trois issues possibles, pas deux : succès, échec, et *inconnu*.** Un timeout ne dit rien sur si l'effet a bien eu lieu côté serveur. Il faut enregistrer l'intention **avant** l'appel externe, pour qu'un crash entre l'appel et la réponse laisse une preuve que quelque chose doit être résolu plus tard — plutôt qu'un débit silencieusement rejoué.

**Règle 6 — Fixer la durée de rétention de la clé selon la chaîne de retry la plus longue possible**, pas selon le coût de stockage. Les clés doivent survivre plus longtemps que n'importe quel chemin capable de re-livrer la même intention — y compris une file d'attente de messages morts ("dead-letter queue") rejouée une semaine plus tard, ou une fenêtre de contestation d'un prestataire de paiement. Une clé qui expire après 24h derrière une file de messages morts de 7 jours, c'est un doublon qui n'attend que l'occasion.

### Patterns REST concrets

**Design de ressources :**
```
GET    /api/tasks              → Lister les tâches (avec paramètres de filtre)
POST   /api/tasks              → Créer une tâche
GET    /api/tasks/:id          → Récupérer une tâche
PATCH  /api/tasks/:id          → Mettre à jour une tâche (partiellement)
DELETE /api/tasks/:id          → Supprimer une tâche
GET    /api/tasks/:id/comments → Lister les commentaires d'une tâche (sous-ressource)
```

**Pagination systématique sur les listes :**
```typescript
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
{
  "data": [...],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 142, "totalPages": 8 }
}
```

**Filtrage par paramètres de requête :**
```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

**PATCH pour les mises à jour partielles** — accepter des objets partiels, ne mettre à jour que ce qui est fourni.

### Patterns TypeScript utiles
- **Les unions discriminées** pour représenter des variantes explicites (un statut de tâche "pending" / "in_progress" / "completed" / "cancelled", chacun avec ses propres champs associés) — le compilateur force alors à gérer chaque cas.
- **Séparer Input et Output** : ce que l'appelant fournit (`CreateTaskInput`) n'est pas la même forme que ce que le système renvoie (`Task`, qui inclut des champs générés côté serveur comme `id`, `createdAt`).
- **Les types "brandés"** pour les identifiants : `type TaskId = string & { readonly __brand: 'TaskId' }` empêche d'utiliser accidentellement un `UserId` là où un `TaskId` est attendu, même si les deux sont techniquement des chaînes de caractères.

### Les rationalisations dangereuses à connaître (et pourquoi elles sont fausses)
| Rationalisation | Réalité |
|---|---|
| "On documentera l'API plus tard" | Les types SONT la documentation. Il faut les définir en premier. |
| "On n'a pas besoin de pagination pour l'instant" | Le besoin arrivera dès que quelqu'un aura 100+ éléments. À prévoir dès le départ. |
| "PATCH c'est compliqué, utilisons PUT" | PUT exige l'objet complet à chaque fois. PATCH, c'est ce que les clients veulent vraiment. |
| "On versionnera l'API quand on en aura besoin" | Des changements cassants sans versionnement cassent les consommateurs. Concevoir pour l'extension dès le départ. |
| "Personne n'utilise ce comportement non documenté" | Loi de Hyrum : si c'est observable, quelqu'un en dépend. |
| "Accepter l'en-tête Idempotency-Key suffit" | L'en-tête est le contrat ; stocker la clé face au résultat, c'est l'implémentation réelle. |
| "Notre file d'attente garantit une livraison exactement une fois" | Aucune file ne le garantit à travers un crash du consommateur — concevoir pour "au moins une fois" avec un traitement idempotent. |
| "Les requêtes dupliquées sont rares" | Elles sont *corrélées* : les retries explosent justement quand une dépendance est dégradée — le moment où les doublons sont les plus probables et les plus coûteux. |

### Signaux d'alarme (red flags) à repérer dans une API existante
- Des endpoints qui renvoient des formes différentes selon les conditions.
- Des formats d'erreur incohérents d'un endpoint à l'autre.
- Une validation dispersée dans le code interne au lieu d'être concentrée aux frontières.
- Des changements cassants sur des champs existants.
- Des endpoints de liste sans pagination.
- Des verbes dans les URLs REST (`/api/createTask` au lieu de `POST /api/tasks`).
- Des réponses d'API tierces utilisées sans validation.
- Un `SELECT` suivi d'un `INSERT` pour une clé d'idempotence — c'est une course, pas une protection.
- Une clé d'idempotence dérivée d'un UUID ou d'un horodatage régénéré à chaque tentative.

### Checklist de vérification finale
- Chaque endpoint a des schémas d'entrée et de sortie typés.
- Les réponses d'erreur suivent un format unique et cohérent.
- La validation n'a lieu qu'aux frontières du système.
- Les endpoints de liste supportent la pagination.
- Les nouveaux champs sont additifs et optionnels (rétrocompatibles).
- La nomenclature est cohérente sur tous les endpoints.
- Les endpoints qui modifient un état honorent une clé d'idempotence, ou sont documentés comme "non sûrs à réessayer."
- La clé est réclamée en une seule opération atomique, protégée par une contrainte d'unicité.
- Une clé réutilisée avec une charge utile différente échoue bruyamment plutôt que de rejouer la mauvaise réponse.
- La rétention des clés survit au chemin de retry le plus long, y compris un rejeu depuis une file de messages morts.

### Exemple guidé, pas à pas
Besoin : un endpoint `POST /orders` qui crée une commande et déclenche un paiement — réessayable sans peur en cas de timeout.
- **Contrat d'abord** : `createOrder(input: CreateOrderInput): Promise<Order>` avec cas limites écrits — panier vide ? double clic ? timeout du prestataire ? Chaque cas a une réponse écrite avant tout code.
- **Erreurs** : 422 si panier invalide, 409 si commande déjà créée pour cette clé, 500 masqué (jamais de détail interne).
- **Validation aux frontières** : schéma Zod sur le body ET sur la réponse du prestataire de paiement (traitée comme non fiable : montant vérifié, type vérifié).
- **Idempotence honorée** : clé fournie par le client, réclamée atomiquement via contrainte d'unicité (pas de SELECT puis INSERT), corps haché et comparé (422 si réutilisation avec un corps différent), doublon "en vol" rejeté en 409, rétention 30 jours (plus longue que la file de messages morts de 7 jours).
- **Checklist finale passée** : pagination n/a ici, nomenclature vérifiée, red flags relus (aucun).
- Résultat : un endpoint qu'on peut appeler 3 fois de suite sans créer 3 commandes — et la preuve (tests de double envoi) plutôt qu'une promesse.

### À toi de pratiquer
Prends une route existante de ton projet et passe-la au crible des signaux d'alarme : formes de réponse variables ? erreurs incohérentes ? validation dispersée ? pagination absente ? Note 3 violations trouvées et, pour chacune, la correction proposée en une phrase.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la loi de Hyrum avec un exemple concret (un ordre de tri non documenté dont quelqu'un finit par dépendre), tu sais réciter le mapping des codes d'erreur HTTP (400/401/403/404/409/422/500), et tu sais dérouler les 6 règles d'une clé d'idempotence correctement honorée — en particulier pourquoi un `SELECT` puis un `INSERT` est une faille de sécurité, pas une protection.

---

## 2. `app-auth`

### C'est quoi, en profondeur
Cette skill est différente des autres : ce n'est pas un ensemble de principes à appliquer, mais un **système de routage intelligent** vers la bonne documentation technique d'Auth0 (un service tiers d'authentification très répandu), quel que soit le langage, le framework, ou l'outil utilisé — et **même si l'utilisateur ne mentionne jamais le mot "Auth0" explicitement**. La skill sait reconnaître qu'une demande comme "je veux que mes utilisateurs confirment avec un code reçu sur leur téléphone" correspond en réalité à de la MFA (authentification multi-facteurs) proposée par Auth0.

C'est une skill de type "détecteur en cascade" : elle avance par étapes successives (intention → framework → outillage → chargement des bons fichiers de référence), un peu comme un arbre de décision.

### Quand l'utiliser
Pour tout ce qui touche à l'authentification d'une application : connexion/déconnexion, sessions et jetons (tokens), protection de routes ou d'endpoints, MFA, SSO, organisations multi-entreprises, gestion des rôles (RBAC), domaines personnalisés, portails self-service, migration depuis un autre fournisseur d'authentification, débogage d'un flux d'authentification qui échoue.

### Étape 1 — Détecter l'intention
La skill ne cherche pas le mot-clé technique exact, elle **fait correspondre le langage naturel du besoin** à une intention précise. Voici les intentions principales et comment les reconnaître :

| Ce que le développeur exprime (en langage courant) | Intention détectée |
|---|---|
| "Ajouter la connexion/inscription à mon appli" | **integrate** |
| "Faire confirmer avec un code après le mot de passe" (SMS, appli d'authentification, empreinte, clé de sécurité) | **feature:mfa** |
| "Chaque entreprise cliente doit avoir ses propres utilisateurs et rôles" (produit B2B) | **feature:organizations** |
| "Un portail où l'utilisateur gère lui-même son profil/sa MFA" sans avoir à le coder soi-même | **feature:universal-portals** |
| "Servir la page de connexion depuis mon propre nom de domaine" | **feature:custom-domains** |
| "Construire un écran de connexion 100% personnalisé avec mon propre code" | **feature:acul** |
| "Changer le logo/les couleurs de la page de connexion" | **feature:branding** |
| "Empêcher un jeton volé d'être réutilisé depuis une autre machine" | **feature:dpop** |
| "Auditer la sécurité/configuration de mon tenant Auth0" | **audit** |
| "Est-ce que mon tenant est en bonne santé et sur le bon forfait ?" | **healthcheck** |
| "Quelles sont les bonnes pratiques ? Comment stocker les tokens en sécurité ?" | **guidance** |
| "J'ai une erreur 401/403/CORS/callback URL mismatch" | **debug** |
| "Erreur 429, quota dépassé" | **debug:rate-limit** |
| "Je veux quitter Clerk/NextAuth/Firebase/Cognito/Okta/Supabase pour Auth0" | **migrate** |
| "Je veux mettre à jour le SDK Auth0 lui-même vers une nouvelle version majeure" | **upgrade-sdk** |
| "Utiliser directement la CLI Auth0, sans framework applicatif" | **tooling** |

**Si rien ne correspond clairement** : choisir l'objectif le plus proche, ou, si c'est vraiment ambigu, **demander** au développeur ce qu'il essaie d'accomplir — jamais deviner à l'aveugle.

### Étape 2 — Détecter le framework
Cette étape est sautée pour l'intention `tooling` (une requête purement CLI n'a pas de framework). Sinon, la détection se fait en **cascade à 3 niveaux**, en s'arrêtant au premier niveau qui donne un résultat :

**Niveau 1 — Le SDK Auth0 est déjà installé (signal le plus fort).** On regarde directement dans les fichiers de dépendances du projet (`package.json`, `requirements.txt`, `build.gradle`, `*.csproj`, `composer.json`, `go.mod`, `pubspec.yaml`...). Par exemple :
- `@auth0/nextjs-auth0` dans `package.json` → framework `nextjs`
- `auth0-server-python` + `flask` dans `requirements.txt` → framework `flask`
- `Auth0.AspNetCore.Authentication` dans un `.csproj` → framework `aspnetcore-auth`

Un détail important : les lignes les plus spécifiques sont vérifiées en premier. Par exemple, un projet Ionic utilisant Angular installe **à la fois** `@capacitor/browser` ET `@auth0/auth0-angular` — il faut vérifier la combinaison Ionic avant de conclure "juste Angular".

**Niveau 2 — Aucun SDK Auth0 trouvé, mais d'autres dépendances du projet révèlent le framework.** Par exemple, la présence de `next` dans `package.json` (sans SDK Auth0 encore installé) indique qu'on est sur un projet Next.js, où le SDK Auth0 reste à ajouter.

**Niveau 3 — Rien dans le code du projet ; se baser sur ce que dit la personne dans sa demande.** Par exemple, si la personne mentionne "Spring Boot", la skill route vers `springboot-api`.

**La désambiguïsation "application web vs API" :** certains frameworks ont deux références séparées selon le contexte. Par exemple, `express` (application web avec interface utilisateur) vs `express-jwt` (juste une API qui valide des jetons, sans interface). La règle : choisir la variante API quand il s'agit uniquement de protéger des routes/valider des JWT, sans interface utilisateur rendue côté serveur. Si l'ambiguïté persiste (à la fois une interface ET des endpoints protégés), il faut **dire ce qui a été détecté et demander** à la personne de trancher plutôt que de deviner.

**En cas de conflit entre le code du projet et ce que dit la personne** (par exemple, elle dit "Next.js" mais `package.json` ne contient pas `next`) : signaler le conflit et demander une clarification. **Les signaux du code du projet l'emportent sur la demande verbale** quand les deux sont présents et cohérents entre eux.

### Étape 3 — Détecter l'outillage
On regarde l'arborescence du projet pour savoir comment la configuration Auth0 sera appliquée :
| Le projet contient... | Outillage chargé |
|---|---|
| Un dossier `terraform/` ou des fichiers `*.tf` | Terraform |
| Le serveur MCP Auth0 actif dans la session de l'agent | MCP |
| Une demande d'intégration Vercel | Vercel |
| Rien de particulier (cas par défaut) | La CLI Auth0 |

### Étape 4 — Charger les bons fichiers de référence
Une fois l'intention, le framework et l'outillage connus, la skill sait précisément quels fichiers de documentation charger. Par exemple, pour l'intention `feature:mfa` : charger la référence MFA + la référence de l'outillage détecté. Pour l'intention `migrate` : charger la référence de migration + l'outillage + le framework si détecté. Un détail important pour l'intention `upgrade-sdk` : **ce n'est pas une migration depuis un autre fournisseur**, c'est une mise à jour de version du SDK Auth0 lui-même — la skill précise explicitement de ne pas charger par erreur la référence de migration dans ce cas.

### Exemple concret de bout en bout
Une personne dit : "je veux que mes utilisateurs de mon appli Next.js confirment leur identité avec une appli d'authentification en plus du mot de passe."
1. **Intention détectée** : `feature:mfa` (authentification multi-facteurs).
2. **Framework détecté** : le projet a `next` dans `package.json` → `nextjs`.
3. **Outillage détecté** : pas de dossier terraform, pas de MCP actif → CLI Auth0 par défaut.
4. **Fichiers chargés** : la référence MFA + la référence de l'outillage CLI + éventuellement la référence spécifique au framework Next.js pour l'intégration technique précise.

### Pièges fréquents
- Deviner un framework à l'aveugle quand le code du projet et la demande verbale se contredisent, au lieu de signaler le conflit et demander.
- Confondre `upgrade-sdk` (mise à jour de version du SDK Auth0) avec `migrate` (quitter un autre fournisseur pour Auth0) — ce sont deux intentions bien distinctes qui chargent des références différentes.
- Sauter la désambiguïsation "web app vs API" et charger la mauvaise référence quand un projet expose à la fois une interface et des endpoints protégés.

### Checklist de sortie
Intention nommée d'après le langage naturel (table des intentions) ; framework détecté avec son niveau de preuve noté (1 = SDK trouvé, 2 = dépendances, 3 = parole seule) ; conflit code-vs-parole signalé le cas échéant ; ambiguïté "web app vs API" tranchée explicitement ; outillage détecté (terraform / MCP / Vercel / CLI par défaut) ; références chargées = intention + outillage (+ framework) ; `upgrade-sdk` jamais confondu avec `migrate`.

### À toi de pratiquer
Classe ces 5 demandes en intentions (et framework deviné) : "connexion Google sur mon app React", "un code SMS après le mot de passe", "mes clients entreprises veulent leurs propres rôles", "je quitte Firebase pour Auth0", "mettre à jour @auth0/nextjs-auth0 en version majeure". Puis, pour l'une d'elles, décris comment tu détecterais le framework aux 3 niveaux.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer les 4 étapes de la cascade de détection (intention → framework → outillage → chargement), tu sais donner un exemple de langage naturel qui correspond à `feature:mfa` sans jamais mentionner "MFA" explicitement, et tu sais pourquoi `upgrade-sdk` et `migrate` sont deux intentions différentes à ne pas confondre.

---

## 3. `data-designer`

### C'est quoi, en profondeur
Cette skill sert à générer des **jeux de données synthétiques** (des données artificielles mais réalistes) via une bibliothèque dédiée appelée "Data Designer" — utile pour tester une application, entraîner un modèle, ou peupler une base de données de démonstration sans utiliser de vraies données personnelles.

### Quand l'utiliser
Dès qu'on a besoin de créer un jeu de données, de générer des données synthétiques, ou de construire un pipeline de génération de données.

### Une règle de démarrage importante
La skill précise explicitement : **ne pas explorer l'espace de travail en premier.** Le flux de travail intégré ("l'étape Learn") donne déjà tout ce dont on a besoin — explorer le projet avant de suivre ce flux serait une perte de temps inutile.

### Les deux modes de fonctionnement
1. **Mode Autopilot** : utilisé quand la personne sous-entend qu'elle ne veut pas répondre à des questions — par exemple si elle dit "sois tranché", "à toi de voir", "fais des suppositions raisonnables", "vas-y, construis", "surprends-moi." Dans ce mode, l'agent prend toutes les décisions lui-même.
2. **Mode Interactive (par défaut)** : l'agent pose des questions à chaque étape importante pour affiner le jeu de données selon les préférences précises de la personne.

Selon le mode choisi, la skill lit **uniquement** le fichier de flux de travail correspondant (`workflows/interactive.md` ou `workflows/autopilot.md`) et le suit à la lettre.

### Les règles de conception à respecter
1. **Garder toutes les colonnes par défaut dans la sortie finale.** Les seules exceptions pour retirer une colonne : soit la personne le demande explicitement, soit c'est une "colonne d'aide" qui n'existe que pour en dériver d'autres (par exemple, un objet "personne" échantillonné juste pour en extraire le nom et la ville, mais qu'on ne garde pas tel quel). **En cas de doute, on garde la colonne.**
2. **Ne jamais suggérer ou demander un jeu de données "seed"** (un jeu de données de départ à partir duquel dériver le nouveau). On n'en utilise un que si la personne en fournit un explicitement, ou demande explicitement de construire à partir de données existantes.
3. **Pour toute donnée impliquant des personnes** (noms, données démographiques, adresses), il faut lire une référence dédiée sur l'échantillonnage de personnes — pour éviter de générer des données biaisées ou irréalistes.
4. **Si un script correspondant à la description du jeu de données existe déjà**, demander à la personne si elle veut le modifier ou en créer un nouveau plutôt que de choisir à sa place.

### Les pièges techniques les plus fréquents (spécifiques à cette bibliothèque)
- **Les colonnes de type "sampler" (échantillonneur) et de validation ont besoin à la fois d'un type et de paramètres.** Exemple : `sampler_type="category"` avec `params=dd.CategorySamplerParams(...)` — oublier l'un des deux fait planter la configuration.
- **Les templates Jinja2** dans les champs `prompt`, `system_prompt`, et `expr` : on référence une colonne avec `{{ column_name }}`, et un champ imbriqué avec `{{ column_name.field }}`.
- **`SamplerColumnConfig` prend un paramètre nommé `params`, pas `sampler_params`** — une erreur de nommage très facile à faire par analogie avec d'autres bibliothèques.
- **L'accès au score d'un juge LLM (`LLMJudgeColumnConfig`) est un piège classique.** Cette configuration produit un dictionnaire imbriqué où chaque nom de score correspond à `{reasoning: str, score: int}`. Pour récupérer la valeur numérique du score, il faut utiliser l'attribut `.score`. Par exemple, pour une colonne de jugement nommée `quality` avec un score nommé `correctness`, on écrit `{{ quality.correctness.score }}` — écrire seulement `{{ quality.correctness }}` renverrait le dictionnaire complet (avec le raisonnement textuel inclus), pas juste le nombre attendu.

### Dépannage (troubleshooting)
- **La commande `data-designer` (CLI) n'est pas trouvée** : informer la personne qu'elle n'est pas installée dans cet environnement (nécessite Python 3.10 ou supérieur). Demander si elle souhaite qu'un environnement virtuel soit créé et la bibliothèque installée, ou si elle préfère le faire elle-même. **Ne jamais installer quoi que ce soit sans la permission explicite de la personne.**
- **Des erreurs réseau pendant la prévisualisation** : un environnement en bac à sable (sandbox) bloque peut-être les requêtes sortantes. Demander la permission de réessayer avec le bac à sable désactivé. En tout dernier recours seulement, si même cela échoue, indiquer à la personne d'exécuter la commande elle-même.

### Le modèle de sortie attendu
La skill génère un fichier Python contenant une fonction `load_config_builder()` qui renvoie un `DataDesignerConfigBuilder`, avec un nom de fichier descriptif (par exemple `customer_reviews.py`), et des métadonnées de dépendances inline au format PEP 723 :

```python
# /// script
# dependencies = [
#   "data-designer", # toujours requis
#   "pydantic", # seulement si ce script importe depuis pydantic
#   # ajouter d'autres dépendances ici
# ]
# ///
import data_designer.config as dd
from pydantic import BaseModel, Field


# Utiliser des modèles Pydantic quand la sortie doit respecter un schéma précis
class MyStructuredOutput(BaseModel):
    field_one: str = Field(description="...")
    field_two: int = Field(description="...")


# Utiliser des générateurs personnalisés quand les types de colonnes intégrés ne suffisent pas
@dd.custom_column_generator(
    required_columns=["col_a"],
    side_effect_columns=["extra_col"],
)
def generator_function(row: dict) -> dict:
    # logique personnalisée dépendant de "col_a", modifie la ligne en place
    row["name_in_custom_column_config"] = "custom value"
    row["extra_col"] = "extra value"
    return row


def load_config_builder() -> dd.DataDesignerConfigBuilder:
    config_builder = dd.DataDesignerConfigBuilder()
    # Jeu de données seed (uniquement si la personne mentionne explicitement un chemin de seed)
    # config_builder.with_seed_dataset(dd.LocalFileSeedSource(path="path/to/seed.parquet"))
    # config_builder.add_column(...)
    # config_builder.add_processor(...)
    return config_builder
```

**Règle importante** : n'inclure les modèles Pydantic, les générateurs personnalisés, les jeux de données seed, et les dépendances supplémentaires **que si la tâche le nécessite réellement** — ne pas ajouter de complexité "au cas où".

### Exemple concret d'application
Demande : "génère-moi un jeu de données de 500 avis clients avec une note de 1 à 5 et un commentaire textuel cohérent avec la note." L'agent identifie que ceci implique potentiellement des données de personnes (nom du client ?) — si oui, il consulte la référence d'échantillonnage de personnes ; sinon, il configure directement une colonne "note" (sampler catégoriel) et une colonne "commentaire" (générée par un prompt LLM qui référence `{{ note }}` via Jinja2 pour rester cohérent avec la note tirée).

### Pièges fréquents
- Explorer inutilement l'espace de travail avant de suivre le flux Learn intégré (perte de temps explicitement déconseillée).
- Écrire `sampler_params` au lieu de `params` dans une configuration de colonne.
- Accéder à `{{ quality.correctness }}` en pensant récupérer un score numérique, alors qu'il faut `{{ quality.correctness.score }}`.
- Installer silencieusement un environnement virtuel ou une dépendance sans demander la permission.

### Checklist de sortie
Mode choisi d'après le langage réel de la demande (autopilot si "à toi de voir", sinon interactif) ; flux Learn suivi sans exploration préalable ; colonnes par défaut conservées (exceptions notées et justifiées) ; seed uniquement si fourni ou demandé ; données de personnes → référence d'échantillonnage lue ; samplers avec type ET paramètres ; scores juges lus via `.score` ; script existant proposé (modifier ou créer) ; aucune installation sans permission explicite ; sortie minimale (pydantic, générateurs, seed ajoutés seulement si nécessaires).

### À toi de pratiquer
Décris sur papier (sans coder) un jeu de 300 lignes : sujet, 5 colonnes avec leurs types, mode choisi et pourquoi en une phrase, et un piège que tu anticipes avec sa parade. Si tu ne peux pas nommer le piège, relis la section des pièges techniques.

### Pour dire que tu maîtrises cette skill
Tu sais expliquer la différence entre les modes Interactive et Autopilot et comment reconnaître lequel utiliser selon le langage de la demande, tu sais corriger l'erreur classique `{{ quality.correctness }}` → `{{ quality.correctness.score }}`, et tu sais pourquoi la skill interdit explicitement d'installer quoi que ce soit sans permission.

---

## Récapitulatif — Partie 1/4

| # | Skill | En une phrase |
|---|-------|----------------|
| 1 | api-and-interface-design | Contrats d'API stables : loi de Hyrum, erreurs cohérentes, validation aux frontières, idempotence honorée |
| 2 | app-auth | Route automatiquement vers la bonne doc Auth0 selon l'intention, le framework et l'outillage détectés |
| 3 | data-designer | Génère des jeux de données synthétiques via une config Python, en mode interactif ou autopilote |

**Suite (partie 2/4) :** le sous-dossier `anthropics` (5 skills : `doc-coauthoring`, `docx`, `pdf`, `pptx`, `xlsx`) — création et coédition de documents bureautiques.
