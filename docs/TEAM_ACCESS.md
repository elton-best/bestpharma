# Équipe, rôles et invitations — premier lot

## Fonctionnalités
- `/equipe` : membres actifs/suspendus, rôles personnalisés, invitations.
- Attribution de plusieurs rôles à un membre par cases à cocher.
- Permissions disponibles : consultation (`qualite.read`) et écriture (`qualite.write`) des actions qualité.
- Administrateur officine distinct des rôles : gestion de l’équipe et droits qualité. Aucun accès clinique implicite.
- Plusieurs administrateurs possibles, mais au moins un administrateur actif doit être conservé.
- Invitation par lien manuel, valable 7 jours et à usage unique, révocable avant acceptation.
- Acceptation `/invitation#token=…` : le fragment évite d’inclure le secret dans l’URL transmise au serveur ou dans le Referer. Le token est transmis dans le corps du POST d’acceptation.
- Aucun e-mail envoyé automatiquement. Le lien doit être partagé par un canal sûr et uniquement avec le destinataire.

## Démonstration
La liste, les rôles et les invitations sont fictifs et enregistrés dans le navigateur. Le bouton « Tester l’acceptation » permet de simuler le parcours. Aucune identité n’est réellement vérifiée, aucune restriction de rôle n’est appliquée comme une barrière de sécurité locale : la protection réelle est côté API. Les mots de passe ne sont jamais sauvegardés dans les données de démonstration.

Réinitialisation équipe indépendante des actions qualité et dossiers d’ouverture.

## API (exécutée et testée localement sur PostgreSQL 16)
Toutes les opérations d’équipe nécessitent un token Sanctum, une officine active sélectionnée, une appartenance active et le statut administrateur de cette officine. L’admin SaaS BEG n’a pas automatiquement les droits d’administration des officines.

| Méthode | Endpoint `/api/v1` | Fonction |
|---|---|---|
| GET | `/team` | Membres, rôles, invitations sans secrets |
| POST | `/team/roles` | Créer un rôle |
| PUT | `/team/roles/{id}` | Modifier le nom et les permissions d’un rôle |
| PUT | `/team/members/{id}` | Statut actif, administrateur, liste des rôles |
| POST | `/team/invitations` | Créer un lien ; secret retourné une seule fois |
| DELETE | `/team/invitations/{id}` | Révoquer une invitation |
| POST | `/invitations/accept` | Accepter avec preuve de possession du lien |

Pour un compte existant, la connexion au compte correspondant à l’adresse invitée est obligatoire. Pour un nouveau compte, le lien et l’adresse doivent correspondre, puis nom et mot de passe sont requis. Les droits proviennent exclusivement de l’invitation serveur, jamais des champs fournis lors de l’acceptation.

## Modèle et sécurité
- `officine_roles` : rôles locaux avec liste de permissions autorisées côté serveur.
- `officine_member_roles` : plusieurs rôles par appartenance.
- `officine_user.is_admin` et `is_active` : administration et suspension locales.
- Les permissions des rôles sont recalculées à chaque requête. Les anciennes permissions directes du pilote sont prises en compte pour compatibilité, puis supprimées lors de la modification d’un membre.
- Les modifications de rôle affectent immédiatement ses membres à leur prochaine requête.
- Les jetons d’invitation sont hachés SHA-256 en base. Ni secret ni empreinte ne sont renvoyés dans les listes ou copiés dans l’audit.
- Verrouillage de la ligne officine pour sérialiser les mutations d’équipe et l’acceptation. Les droits de l’administrateur sont revérifiés après acquisition du verrou, pour refuser les requêtes concurrentes autorisées avant une rétrogradation.
- Le dernier administrateur actif ne peut être rétrogradé ou suspendu. Une invitation d’administrateur non acceptée n’est pas comptée.
- Aucun rôle, membre ou invitation d’une autre officine ne peut être affecté ou modifié.
- Audit transactionnel des créations/modifications de rôles, changements de membres et invitations.

Ce RBAC pilote est indépendant des anciennes tables Spatie du canevas. Il ne faut pas activer un second mécanisme concurrent de permissions sans migration et tests explicites.

## Activation et migration
Exécuter toutes les migrations avant utilisation. Une activation BEG crée désormais l’administrateur initial de l’officine. La migration reprend les demandeurs des officines déjà activées comme administrateurs initiaux ; le seeder local marque l’administrateur démo. Toute autre officine historique sans demandeur doit faire l’objet d’un provisionnement administratif contrôlé, jamais d’une promotion automatique de tous ses membres.

## Validation et limites
- 32 tests frontend exécutés : stockage, multi-rôles, dernier administrateur, invitations, révocation, expiration, parcours UI, inscription et qualité.
- Build TypeScript + Vite réussi.
- Les 11 tests équipe sont exécutés : suite totale de 29 tests / 120 assertions réussie sur SQLite et PostgreSQL 16. Invitation et dernier administrateur également vérifiés par HTTP concurrent.
- Analyse syntaxique statique réussie sur les 207 fichiers PHP ; pas une preuve d’exécution.
- À tester obligatoirement sur PostgreSQL : migrations, refus croisés, concurrence réelle de deux rétrogradations/acceptations. SQLite ne prouve pas l’efficacité des verrous.
- Email, vérification email, récupération de compte, CSP/HTTPS, audit sécurité et tests navigateur réels restent requis avant production.
- Pas de suppression des rôles ou membres dans ce lot ; suspension et révision des droits privilégiées.
- Habilitations cliniques, personnel RH et droits des autres modules à construire séparément.
