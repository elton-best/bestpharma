-- AI Factory — seed catalogue D1 (idempotent, Sur Cloudflare D1 distant).
-- wrangler d1 execute <DB> --remote --file=scripts/d1-seed.sql

INSERT OR REPLACE INTO courses (id, title, description, position, published) VALUES
('c1', 'Parcours Accélérateur AIFAC', 'Du Spec au Deliver : Apprends à spécifier, tester et livrer des applications web & IA de niveau professionnel.', 1, 1);

INSERT OR REPLACE INTO course_modules (id, course_id, step, title, free, position, published) VALUES
('m1', 'c1', 'Spec', 'Écrire ce qu’on livre', 1, 1, 1),
('m2', 'c1', 'Plan', 'Découper pour avancer', 0, 2, 1),
('m3', 'c1', 'Build', 'Construire avec les agents', 0, 3, 1),
('m4', 'c1', 'Review', 'Faire corriger, itérer', 0, 4, 1),
('m5', 'c1', 'Deliver', 'Livrer pour de vrai', 0, 5, 1);

INSERT OR REPLACE INTO lessons (id, module_id, title, minutes, body, task, kind, position, published) VALUES
('m1-l1', 'm1', 'Pourquoi les projets n’aboutissent pas', 8, 'La plupart des projets s’arrêtent à 80 % parce que « fini » n’a jamais été défini.

Un agent IA amplifie ce flou : il produit vite, mais dans toutes les directions.', 'Liste 3 projets que tu as abandonnés et note pour chacun ce qui manquait pour dire « terminé ».', 'text', 1, 1),
('m1-l2', 'm1', 'Écrire une spec testable', 14, 'Une spec testable décrit un comportement observable : « quand je clique sur Payer, je vois un reçu ».

Chaque phrase doit pouvoir devenir une case à cocher.', 'Rédige la spec d’une page de connexion en 6 phrases vérifiables.', 'text', 2, 1),
('m1-l3', 'm1', 'Définir « Done »', 10, 'Done = tests verts, revue passée, déployé, montré à quelqu’un.

Tu écris ta définition de Done avant d’écrire une seule ligne de code.', 'Écris ta checklist Done personnelle (5 à 8 points).', 'text', 3, 1),
('m2-l1', 'm2', 'Découper en tâches vérifiables', 12, 'Une bonne tâche tient en une demi-journée et se termine par une preuve.

Si tu ne peux pas la tester, découpe-la encore.', 'Transforme ta spec de connexion en 5 à 8 tâches ordonnées.', 'text', 1, 1),
('m2-l2', 'm2', 'Prioriser pour livrer vite', 9, 'Commence par le chemin le plus court vers une version utilisable.

Le reste va dans une liste « plus tard ».', 'Marque les tâches indispensables et repousse le reste.', 'text', 2, 1),
('m3-l1', 'm3', 'Brancher tes agents sur les skills ai-factory', 18, 'Un skill est une instruction réutilisable : l’agent sait comment faire, pas seulement quoi faire.

Charge un skill par tâche, vérifie le résultat, puis passe à la suivante.', 'Choisis 3 skills du registre et applique-les à ta première tâche.', 'text', 1, 1),
('m3-l2', 'm3', 'Effets 3D sans douleur', 16, 'Les 45 effets 3D du registre sont pensés pour rester légers.

Respecte toujours la préférence « réduire les animations ».', 'Ajoute un effet du registre à ta page et mesure son impact.', 'text', 2, 1),
('m3-l3', 'm3', 'Tester en continu', 13, 'Chaque tâche terminée doit laisser un test derrière elle.

Demande à l’agent d’écrire le test avant le code.', 'Écris 3 tests pour ta page de connexion.', 'text', 3, 1),
('m4-l1', 'm4', 'Lire une correction ligne par ligne', 11, 'Un retour n’est pas une note : c’est une liste d’actions.

Traite chaque commentaire et réponds-y.', 'Relis ton propre code comme un correcteur et note 5 améliorations.', 'text', 1, 1),
('m4-l2', 'm4', 'Itérer jusqu’à validation', 10, 'On renvoie tant que la checklist Done n’est pas entièrement cochée.

Deux ou trois allers-retours sont normaux.', 'Soumets ton premier rendu dans « Rendus et projets ».', 'text', 2, 1),
('m5-l1', 'm5', 'Déployer proprement', 12, 'Un projet non déployé n’existe pas.

Vérifie titre, description et page d’erreur avant de partager le lien.', 'Déploie ton projet et colle le lien dans ton rendu.', 'text', 1, 1),
('m5-l2', 'm5', 'Présenter ta livraison', 8, 'Montre le problème, la solution, la preuve (tests, lien en ligne).

Trois minutes suffisent.', 'Enregistre une présentation de 3 minutes de ton projet.', 'text', 2, 1);

INSERT OR REPLACE INTO quiz_questions (id, module_id, question, choices, correct, explanation, points, position, published) VALUES
('q1', 'm1', 'Quelle est la première étape indispensable avant d’écrire une ligne de code ?', '["Choisir le framework", "Rédiger une spec testable et définir Done", "Configurer le serveur", "Créer le logo"]', 1, 'Définir "Done" et rédiger une spec testable évite le flou et les blocages à 80%.', 10, 1, 1),
('q2', 'm2', 'Comment découper une tâche pour qu’elle soit efficace ?', '["Elle doit durer 2 semaines", "Elle doit tenir en 1/2 journée et se terminer par une preuve", "Elle ne doit pas être testée", "Elle doit englober tout le projet"]', 1, 'Une bonne tâche tient en une demi-journée et se termine par une preuve mesurable.', 10, 1, 1),
('q3', 'm3', 'Qu’est-ce qu’un skill AIFAC pour un agent IA ?', '["Un simple prompt de politesse", "Une instruction réutilisable et versionnée", "Un fichier d’image", "Un mot de passe"]', 1, 'Un skill apporte une méthode et des contraintes structurées à l’agent IA.', 10, 1, 1);
