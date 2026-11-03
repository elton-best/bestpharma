import os
import sys
import re
import json
import yaml

SKILLS_ROOT = '/home/elton/ai-factory'
DEST_JSON = '/home/elton/ai-factory-99102579/src/data/skills-data.json'

os.makedirs('/home/elton/ai-factory-99102579/src/data', exist_ok=True)

cat_meta = {
    '00-orchestration': {
        'key': 'orchestration',
        'label': 'Orchestration & Méthodologie IA',
        'tagline': 'Gouvernance, TDD, découpage de tâches et supervision d\'agents autonomes',
        'problem_context': 'Sans cadre méthodologique strict, les agents IA ont tendance à halluciner, à modifier trop de fichiers à la fois sans plan, à casser du code existant et à déclarer une tâche "terminée" sans vérifier la compilation ni les tests. Le développeur se retrouve à devoir nettoyer des régressions massives et perd tout gain de productivité.',
        'value_context': 'Ce skill impose une discipline d\'ingénierie d\'élite : chaque décision est justifiée, chaque tâche est découpée en étapes atomiques vérifiables, et aucun code n\'est livré sans validation préalable. Vous pilotez l\'IA comme un directeur technique chevronné.'
    },
    '01-frontend-design': {
        'key': 'frontend-design',
        'label': 'Frontend, UI & Design System',
        'tagline': 'Règles visuelles, Refactoring UI, typographie, palettes et architecture UI de pointe',
        'problem_context': 'La majorité des interfaces générées par IA souffrent d\'un manque cruel de hiérarchie visuelle : boutons sans contraste adéquat, espacements incohérents, surcharge de bordures inutiles, absence d\'états vides soignés et palettes de couleurs criardes. L\'apparence semble amateur et repousse les utilisateurs.',
        'value_context': 'Ce skill transforme une interface banale en une expérience haut de gamme (digne des meilleurs SaaS de la Silicon Valley). Vous appliquez des règles mathématiques d\'espacement, des échelles typographiques calibrées et une micro-hiérarchie visuelle sans faille.'
    },
    '02-backend-docs': {
        'key': 'backend-docs',
        'label': 'Backend, API & Documentation',
        'tagline': 'APIs Node/Fastify, architectures de données, validation Zod et spécifications vivantes',
        'problem_context': 'Les backends codés à la va-vite souffrent de failles d\'injection de types, d\'absence de validation en entrée/sortie (mélangeant des objets mal formés en base), d\'endpoints non documentés et d\'architectures en spaghetti qui s\'effondrent dès que le trafic augmente.',
        'value_context': 'Ce skill garantit une étanchéité totale : validation stricte par schémas Zod, typage statique de bout en bout avec TypeScript, architecture de services claire et documentation automatique toujours synchronisée avec le code source.'
    },
    '03-agents-ai': {
        'key': 'agents-ai',
        'label': 'Agents IA, LLM & Tool-Calling',
        'tagline': 'Patterns d\'agents autonomes, RAG, prompt engineering, navigateur headless et boucle de décision',
        'problem_context': 'Développer des agents IA sans protocole rigoureux mène à des boucles infinies de requêtes coûteuses, à des appels d\'outils (tool-calling) qui échouent silencieusement, à des fuites de contexte de tokens et à des réponses imprévisibles en conditions réelles.',
        'value_context': 'Ce skill arme le développeur des patterns les plus avancés de l\'écosystème : isolation des contextes, fallbacks gracieux, schémas stricts pour les outils, automatisation de navigateur robuste (CDP headless) et mécanismes d\'évaluation continue.'
    },
    '04-qa-debug': {
        'key': 'qa-debug',
        'label': 'QA, Tests & Débogage Systématique',
        'tagline': 'Diagnostic de cause racine, suites de tests de non-régression et validation automatique',
        'problem_context': 'Face à un bug, l\'erreur fatale consiste à tester des "correctifs au pif" en modifiant du code au hasard jusqu\'à ce que ça semble fonctionner. Cette approche masque les symptômes réels, crée des effets de bord cachés et introduit de la dette technique toxique.',
        'value_context': 'Ce skill applique la Loi d\'Airain du Débogage : interdiction absolue de toucher au code de production tant que la cause racine exacte n\'a pas été isolée et reproduite par un test défaillant. Zéro supposition, uniquement des preuves empiriques.'
    },
    '05-architecture': {
        'key': 'architecture',
        'label': 'Architecture & Systèmes Logiciels',
        'tagline': 'Clean architecture, domain modeling, communication inter-services et gouvernance',
        'problem_context': 'Les projets grandissent vite et deviennent des monolithes ingérables si les frontières de modules et les modèles de domaine ne sont pas définis dès le premier jour. Les développeurs perdent des heures à comprendre où placer chaque logique métier.',
        'value_context': 'Ce skill fournit les plans de construction d\'architectures modulaires, profondes et découplées, garantissant que votre codebase reste lisible, testable et extensible pendant des années.'
    },
    'skills': {
        'key': 'core-skills',
        'label': 'Skills Socles AI Factory',
        'tagline': 'Les 7 compétences piliers pour le cycle complet de développement logiciel autonome',
        'problem_context': 'Sans compétences socles intégrées, une équipe navigue à vue. Le frontend ne respecte pas les tokens, le backend renvoie des types incohérents, la sécurité est oubliée et personne ne valide la qualité avant la mise en production.',
        'value_context': 'Les 7 skills socles constituent la constitution technique d\'AI Factory : ils définissent les standards inviolables de qualité, de sécurité, de design et d\'exécution que chaque agent et chaque développeur doit respecter à la lettre.'
    }
}

def strip_markdown(text):
    if not text:
        return ''
    t = text
    # remove code fences
    t = re.sub(r'```[a-zA-Z0-9_-]*\n', '', t)
    t = re.sub(r'```', '', t)
    # remove headers
    t = re.sub(r'^#{1,6}\s+', '', t, flags=re.M)
    # remove bold / italics
    t = re.sub(r'\*\*(.+?)\*\*', r'\1', t)
    t = re.sub(r'\*(.+?)\*', r'\1', t)
    t = re.sub(r'__(.+?)__', r'\1', t)
    # remove quotes
    t = re.sub(r'^>\s*', '', t, flags=re.M)
    # remove links
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    # remove bullet symbols at start of lines for paragraph reading
    t = re.sub(r'^\s*[-*+]\s+', '• ', t, flags=re.M)
    # clean extra blank lines
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()

def extract_section_raw(content, header_regex_list):
    for pat in header_regex_list:
        m = re.search(pat, content, re.IGNORECASE | re.MULTILINE)
        if m:
            start = m.end()
            next_h = re.search(r'\n#{1,3}\s+', content[start:])
            end = start + next_h.start() if next_h else len(content)
            extracted = content[start:end].strip()
            if len(extracted) > 15:
                return extracted
    return ''

all_skills = []
seen_ids = set()

for root, dirs, files in os.walk(SKILLS_ROOT):
    if any(ignore in root for ignore in ['node_modules', '.git', '.claude', '.codex', '.opencode']):
        continue
    for file in files:
        if file == 'SKILL.md':
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                raw = f.read()

            rel = os.path.relpath(filepath, SKILLS_ROOT)
            parts = rel.split('/')
            cat_folder = parts[1] if parts[0] == 'library' else parts[0]
            cat_info = cat_meta.get(cat_folder, {
                'key': 'general',
                'label': 'Général',
                'tagline': 'Compétences transverses',
                'problem_context': 'L\'absence de directives claires conduit à des approximations et des erreurs d\'implémentation.',
                'value_context': 'Ce skill fournit un cadre d\'action éprouvé pour atteindre l\'excellence.'
            })

            subcat = parts[2] if parts[0] == 'library' and len(parts) > 2 else 'core'

            # Frontmatter parse
            fm_name = ''
            fm_desc = ''
            body = raw
            if raw.startswith('---'):
                split_fm = raw.split('---', 2)
                if len(split_fm) >= 3:
                    try:
                        fm_data = yaml.safe_load(split_fm[1]) or {}
                        fm_name = str(fm_data.get('name', ''))
                        fm_desc = str(fm_data.get('description', ''))
                        body = split_fm[2].strip()
                    except Exception:
                        body = raw.strip()

            folder_name = os.path.basename(os.path.dirname(filepath))
            base_id = fm_name or folder_name
            base_id = re.sub(r'^[0-9]+-', '', base_id).strip().lower()
            base_id = re.sub(r'[^a-z0-9_-]+', '-', base_id).strip('-')

            slug = base_id
            idx = 1
            while slug in seen_ids:
                idx += 1
                slug = f"{base_id}-{idx}"
            seen_ids.add(slug)

            # Title
            h1_match = re.search(r'^#\s+(.+)$', body, re.M)
            if h1_match:
                title = h1_match.group(1).strip()
            else:
                title = fm_name.replace('-', ' ').title() if fm_name else base_id.replace('-', ' ').title()
            title = re.sub(r'^(Skill|Guide|Meta-Skill)\s*[-—:]\s*', '', title, flags=re.I).strip()

            # Raw extracted sections
            raw_overview = extract_section_raw(body, [
                r'##\s*(?:Overview|Vue d\'ensemble|Définition|Definition|Rôle|Role)[^\n]*\n',
                r'##\s*1\.\s*(?:Rôle|Overview|Définition)[^\n]*\n',
                r'##\s*Purpose[^\n]*\n'
            ])
            raw_when = extract_section_raw(body, [
                r'##\s*(?:When to Use|Quand l\'utiliser|Triggers|Quand l\'utiliser / When to use)[^\n]*\n',
                r'##\s*1bis\.\s*(?:Quand l\'utiliser / When to use)[^\n]*\n',
                r'##\s*1\.\s*(?:Quand l\'utiliser)[^\n]*\n',
                r'##\s*2\.\s*(?:Quand l\'utiliser)[^\n]*\n'
            ])
            raw_how = extract_section_raw(body, [
                r'##\s*(?:How to Use|Comment l\'utiliser|Process|Processus|Instructions|Workflow|Directives)[^\n]*\n',
                r'##\s*3\.\s*(?:Workflow|Process|Instructions)[^\n]*\n',
                r'##\s*2\.\s*(?:Workflow|Process|Instructions)[^\n]*\n',
                r'##\s*Rules[^\n]*\n'
            ])
            raw_what = extract_section_raw(body, [
                r'##\s*(?:What It Does|À quoi il sert|Objectifs|Périmètre|The Iron Law|Core Principle)[^\n]*\n',
                r'##\s*2\.\s*(?:À quoi il sert|Objectif)[^\n]*\n'
            ])

            # Clean readable text versions (NO raw MD hashes or backtick fences)
            clean_overview = strip_markdown(raw_overview) if raw_overview else strip_markdown(fm_desc)
            if not clean_overview or len(clean_overview) < 50:
                clean_overview = f"Le skill {title} définit le standard d'excellence et la méthodologie rigoureuse pour maîtriser ce domaine en développement logiciel assisté par IA. Il élimine l'improvisation et encadre chaque étape de travail pour garantir une qualité de code irréprochable."

            clean_when = strip_markdown(raw_when) if raw_when else f"Activez systématiquement ce skill dès que votre tâche concerne {title.lower()} ou lorsqu'une exigence de qualité stricte est requise. Ne commencez aucune implémentation sans avoir passé en revue les critères de ce skill."

            clean_how = strip_markdown(raw_how) if raw_how else f"1. Analyse préalable du contexte existant et des dépendances.\n2. Rédaction d'un plan d'intervention clair et découpage en étapes atomiques.\n3. Implémentation chirurgicale sans altérer les modules non concernés.\n4. Vérification systématique par compilation, exécution de tests et revue de non-régression."

            clean_what = strip_markdown(raw_what) if raw_what else f"Ce skill fournit une directive opérationnelle complète : il garantit la cohérence technique, prévient les régressions, standardise les pratiques de code et automatise les vérifications critiques avant toute mise en production."

            # Construct Deep Pedagogical Sheet (Fiche Pratique Complète)
            concept_explanation = f"""{clean_overview}

Dans l'ingénierie moderne augmentée par l'intelligence artificielle, ce skill ne se résume pas à une simple checklist : c'est un modèle mental d'excellence. Il apprend au développeur et à l'agent IA à opérer avec une précision chirurgicale, en anticipant les contraintes d'architecture, de typage et de maintenabilité à long terme."""

            challenges_faced = f"""{cat_info['problem_context']}

Spécifiquement pour {title} :
• Le piège numéro 1 consiste à aller trop vite en tentant d'implémenter sans comprendre l'ensemble des dépendances et des cas limites.
• Les modèles d'IA sans ce skill génèrent fréquemment du code plausible en apparence mais vulnérable aux effets de bord, aux incohérences de styles ou aux erreurs silencieuses en production.
• Sans cette rigueur, le développeur passe 80% de son temps à corriger des bugs introduits par inadvertance au lieu de créer de la réelle valeur métier."""

            superpowers = f"""{cat_info['value_context']}

Ce que vous maîtrisez grâce à ce skill :
1. Précision senior : chaque décision d'architecture et chaque ligne de code répond à une exigence précise et documentée.
2. Détection préventive : identification immédiate des erreurs de conception avant même qu'elles n'atteignent l'environnement d'exécution.
3. Alignement parfait avec les agents IA : votre assistant (Cursor, Claude, Copilot) sait exactement quelles limites ne jamais franchir."""

            protocol_steps = [
                {
                    "step": 1,
                    "title": "Phase 1 : Cadrage & Diagnostic Préalable",
                    "description": "Inspectez scrupuleusement les fichiers existants, lisez les types TypeScript et définissez précisément le périmètre d'intervention. Interdiction absolue d'écrire la moindre ligne de code avant d'avoir validé cette étape."
                },
                {
                    "step": 2,
                    "title": "Phase 2 : Découpage Atomique & Traçabilité",
                    "description": "Décomposez l'intervention en micro-tâches vérifiables. Chaque modification doit pouvoir être testée et isolée individuellement afin d'éviter tout effet domino sur le reste de la plateforme."
                },
                {
                    "step": 3,
                    "title": "Phase 3 : Implémentation Rigoureuse",
                    "description": "Appliquez les patterns prescrits par ce skill. Utilisez un typage strict (zéro 'any'), respectez les conventions du design system et la séparation stricte des responsabilités."
                },
                {
                    "step": 4,
                    "title": "Phase 4 : Contrôle Qualité & Recette de Non-Régression",
                    "description": "Exécutez le typecheck, lancez les tests automatisés et réalisez une revue critique de votre propre code. Validez la checklist de sortie avant de considérer la tâche comme terminée."
                }
            ]

            dos_and_donts = {
                "dos": [
                    "Toujours formuler et vérifier l'hypothèse de cause racine avant toute modification.",
                    "S'assurer que chaque composant ou fonction possède une responsabilité unique et limpide.",
                    "Vérifier systématiquement la compilation TypeScript et l'absence de warnings.",
                    "Documenter les choix non triviaux et mettre à jour les schémas partagés."
                ],
                "donts": [
                    "Ne jamais tenter des correctifs 'au hasard' en espérant que le problème disparaisse.",
                    "Ne jamais contourner le système de types avec des casts forcés ou du typage lâche.",
                    "Ne jamais mélanger plusieurs responsabilités dans un même fichier ou composant.",
                    "Ne jamais déclarer une tâche 'terminée' sans l'avoir testée en conditions réelles."
                ]
            }

            # Production-Grade System Prompt for AI Agent (Cursor / Claude / Copilot)
            agent_prompt_detailed = f"""# DIRECTIVE SYSTÈME D'ÉLITE — SKILL : {title.upper()}
Identifiant technique : `{slug}`
Domaine : {cat_info['label']}
Niveau de rigueur : STRICT & INVIOLABLE

Tu opères désormais en tant qu'Architecte Senior spécialisé dans l'application stricte du skill `{slug}`.
Tu dois adopter sans dévier la posture technique et les exigences décrites ci-dessous.

## 1. MISSION PRINCIPALE
{clean_overview}

## 2. GARDE-FOUS ET CONTRAINTES STRICTES (RÈGLES D'OR)
- INTERDICTION D'EXTRAPOLER : Si une information manque ou si une ambiguïté existe, demande clarification avant d'agir.
- RESPECT DES TYPES STRICTS : Aucun 'any' n'est toléré. Tout objet manipulé doit être typé via TypeScript ou validé via Zod.
- TRAVAIL CHIRURGICAL : Ne modifie aucun fichier extérieur au périmètre de la tâche sans justification technique explicite.
- CONTRÔLE DE NON-RÉGRESSION : Après chaque modification, vérifie que le code compile et que les fonctionnalités annexes restent intactes.

## 3. PROTOCOLE D'EXÉCUTION DU SKILL `{slug}`
1. ANALYSE : Examine attentivement le code existant, les schémas de données et l'environnement avant de proposer un plan.
2. PLANIFICATION : Décris clairement en 3 à 5 points les étapes d'intervention avant de modifier les fichiers.
3. RÉALISATION : Écris un code modulaire, concis, commenté sur les points clés et respectant l'architecture de la plateforme.
4. VALIDATION : Effectue une vérification pas-à-pas des critères d'acceptation et confirme la stabilité du livrable.

## 4. DÉCLENCHEURS SITUATIONNELS
Ce skill doit être invoqué dès que la demande de l'utilisateur correspond à :
{clean_when}

Applique ce protocole avec une discipline absolue."""

            agent_config_mdc = f"""---
description: "Règles d'élite pour le skill {title} ({slug})"
globs: "**/*"
alwaysApply: false
---

# Directives d'agent pour le skill {slug}
Dès que la tâche touche à : {slug}, {title.lower()}
- Appliquer strictement la checklist du skill {slug}.
- Valider systématiquement la non-régression et le respect des types.
"""

            claude_code_command = f"""claude -p "Adopte le skill {slug} ({title}). Applique scrupuleusement la méthodologie et les gardes-fous prescrits sans extrapolation." """

            # Tags
            tag_words = set(re.findall(r'[a-zA-Z0-9_-]{3,}', (slug + ' ' + title + ' ' + fm_desc).lower()))
            common_stops = {'the', 'and', 'for', 'with', 'when', 'use', 'from', 'this', 'that', 'skill', 'are', 'vous', 'pour', 'dans', 'les', 'des', 'une'}
            tags = [w for w in tag_words if w not in common_stops and len(w) > 2][:8]
            if cat_info['key'] not in tags:
                tags.insert(0, cat_info['key'])

            skill_entry = {
                'id': slug,
                'name': title,
                'category': cat_info['key'],
                'categoryLabel': cat_info['label'],
                'categoryTagline': cat_info['tagline'],
                'subcategory': subcat,
                'shortDescription': fm_desc or clean_overview[:180],
                # Fiche Pratique Développeur (Rich Text, no raw MD hashes)
                'pedagogy': {
                    'conceptExplanation': concept_explanation.strip(),
                    'challengesFaced': challenges_faced.strip(),
                    'superpowers': superpowers.strip(),
                    'whenToUse': clean_when.strip(),
                    'howToUse': clean_how.strip(),
                    'protocolSteps': protocol_steps,
                    'dosAndDonts': dos_and_donts
                },
                # Affectation Agent IA
                'agentAssignment': {
                    'systemPrompt': agent_prompt_detailed.strip(),
                    'activationTriggers': clean_when.strip(),
                    'agentConfigSnippet': agent_config_mdc.strip(),
                    'claudeCodeCommand': claude_code_command.strip()
                },
                'tags': tags,
                # Full source markdown kept for clean copy
                'fullMarkdownSource': raw.strip()
            }
            all_skills.append(skill_entry)

all_skills.sort(key=lambda s: (s['category'], s['name']))

with open(DEST_JSON, 'w', encoding='utf-8') as f:
    json.dump(all_skills, f, ensure_ascii=False, indent=2)

print(f"Rich skills catalog generated successfully: {len(all_skills)} skills in {DEST_JSON}!")
print(f"File size: {os.path.getsize(DEST_JSON) / 1024:.1f} KB")
