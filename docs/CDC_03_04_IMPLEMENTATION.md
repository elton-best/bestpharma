# Modules 03 et 04 — première intégration technique

Les CDC fournis restent des cadrages à valider par les métiers. L’implémentation ne transforme pas leurs propositions en obligations réglementaires ou délais métier.

## M3 — Documents et canevas

Le socle existant M3 est raccordé au module 04 : documents par officine, brouillon versionné, soumission/approbation sur empreinte/version, révisions, pièces jointes en stockage privé avec vérification SHA-256, imports de sources en quarantaine, qualification humaine, canevas immuables approuvés et enregistrements qui conservent leur instantané de modèle. M4 ne copie pas le document : il référence une version ayant une entrée dans `document_approvals` du même tenant.

La GED n’implémente pas encore toute la diffusion/attestation, les demandes de correction formalisées, export contrôlé, construction complète de formulaires, conservation paramétrable ni BPD structuré. L’état `available=false` du corpus BPD est volontaire : aucune validation de corpus/règles métier n’est présumée.

## M4 — Plans et actions

Registre dédié dans `action_plans`, `module4_actions` et leurs tables d’événements, sources, preuves et revues d’efficacité. Routes sous `/api/v1/qualite/actions-v2` : listes/indicateurs, plans et décisions, actions, transitions, échéances, preuves et efficacité. Les droits sont revalidés dans le tenant actif ; les sources M2 constat/mission et les documents M3 sont contrôlés contre la même officine. Les sources risque/réclamation non intégrées sont acceptées en libellé descriptif seulement, sans identifiant métier non vérifié.

Une action ne se clôture qu’après réalisation/vérification, preuve documentaire approuvée et revue d’efficacité positive. Une revue négative ramène l’action en reprise. Les reports conservent ancien et nouveau délai avec motif. Le retard est calculé à la lecture, il n’est pas un état permanent. Les décisions et preuves conservent l’historique et la version documentaire exacte. Création avec clé de rejeu, version optimiste et transactions.

Les plans M2 approuvés peuvent être importés une seule fois. L’intégration s’arrête sans effet partiel si un responsable textuel M2 ne correspond pas à un membre actif. La clôture de mission, exports, alertes configurables, assignations internes plus fines, mesures d’efficacité paramétrées et sources risques/réclamations structurées restent à compléter.

Les emails locaux utilisant `MAIL_MAILER=log` sont simulés : leur journalisation ne constitue pas une livraison. Aucun transfert à l’ABMed, signature juridique, délai réglementaire ni barème n’est déclaré.
