import os
import sys
import re
import json
import yaml

SKILLS_ROOT = '/home/elton/ai-factory'
DEST_JSON = '/home/elton/ai-factory-99102579/src/data/skills-data.json'

os.makedirs('/home/elton/ai-factory-99102579/src/data', exist_ok=True)

cat_map = {
    '00-orchestration': ('orchestration', 'Orchestration & Méthodologie IA', 'Méthodes de conception, TDD, découpage de tâches, review et orchestration multi-agents'),
    '01-frontend-design': ('frontend-design', 'Frontend, UI & Design System', 'Règles visuelles, Refactoring UI, typographie, palettes, micro-interactions et architecture UI'),
    '02-backend-docs': ('backend-docs', 'Backend, API & Documentation', 'APIs Node/Fastify, architectures de données, documentation technique et spécifications vivantes'),
    '03-agents-ai': ('agents-ai', 'Agents IA, LLM & Tool-Calling', "Patterns d'agents autonomes, RAG, prompt engineering, navigateur headless et boucle de décision"),
    '04-qa-debug': ('qa-debug', 'QA, Tests & Débogage Systématique', 'Diagnostic de cause racine, suites de tests, automatisation Playwright/Cypress et vérification'),
    '05-architecture': ('architecture', 'Architecture & Systèmes Logiciels', 'Clean architecture, domain modeling, communication inter-services et gouvernance technique'),
    'skills': ('core-skills', 'Skills Socles AI Factory', 'Les 7 compétences piliers pour le cycle complet de développement logiciel autonome')
}

all_skills = []
seen_ids = set()

def clean_text(t):
    if not t:
        return ''
    t = re.sub(r'[\r\n]+', '\n', t).strip()
    return t

def extract_section(content, section_patterns):
    for pattern in section_patterns:
        m = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
        if m:
            start = m.end()
            next_h = re.search(r'\n#{1,3}\s+', content[start:])
            end = start + next_h.start() if next_h else len(content)
            extracted = content[start:end].strip()
            if len(extracted) > 15:
                return extracted
    return ''

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
            cat_key, cat_label, cat_desc = cat_map.get(cat_folder, ('other', 'Général', 'Compétences transverses'))
            
            subcat = parts[2] if parts[0] == 'library' and len(parts) > 2 else 'core'

            # Parse frontmatter
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

            # Definition
            definition = extract_section(body, [
                r'##\s*(?:Overview|Vue d\'ensemble|Définition|Definition|Rôle|Role)[^\n]*\n',
                r'##\s*1\.\s*(?:Rôle|Overview|Définition)[^\n]*\n'
            ])
            if not definition:
                definition = fm_desc or f"Skill spécialisé en {title} pour le développement assisté par IA et l'ingénierie logicielle avancée."

            # What it does (À quoi il sert)
            what_it_does = extract_section(body, [
                r'##\s*(?:What It Does|À quoi il sert|Objectifs|Périmètre|The Iron Law|Core Principle)[^\n]*\n',
                r'##\s*2\.\s*(?:À quoi il sert|Objectif)[^\n]*\n'
            ])
            if not what_it_does:
                what_it_does = fm_desc or f"Fournit les règles, directives et protocoles stricts pour exécuter la compétence {title} sans régression."

            # When to use (Quand et pour quoi l'utiliser)
            when_to_use = extract_section(body, [
                r'##\s*(?:When to Use|Quand l\'utiliser|Triggers|Quand l\'utiliser / When to use)[^\n]*\n',
                r'##\s*1bis\.\s*(?:Quand l\'utiliser / When to use)[^\n]*\n',
                r'##\s*1\.\s*(?:Quand l\'utiliser)[^\n]*\n'
            ])
            if not when_to_use:
                when_to_use = f"À activer dès que la tâche implique {title.lower()} ou lorsqu'une exigence de qualité stricte est requise sur ce périmètre."

            # How to use (Comment l'utiliser)
            how_to_use = extract_section(body, [
                r'##\s*(?:How to Use|Comment l\'utiliser|Process|Processus|Instructions|Workflow|Directives)[^\n]*\n',
                r'##\s*2\.\s*(?:Process|Instructions|Workflow)[^\n]*\n',
                r'##\s*3\.\s*(?:Process|Workflow|Méthode)[^\n]*\n'
            ])
            if not how_to_use:
                how_to_use = f"Consulter les directives détaillées dans le markdown complet du skill, appliquer la checklist point par point avant de valider la tâche."

            # Tags
            tag_words = set(re.findall(r'[a-zA-Z0-9_-]{3,}', (slug + ' ' + title + ' ' + fm_desc).lower()))
            common_stops = {'the', 'and', 'for', 'with', 'when', 'use', 'from', 'this', 'that', 'skill', 'are', 'vous', 'pour', 'dans', 'les', 'des', 'une'}
            tags = [w for w in tag_words if w not in common_stops and len(w) > 2][:8]
            if cat_key not in tags:
                tags.insert(0, cat_key)

            # Clean snippet strings
            short_desc = (fm_desc or definition).split('\n')[0][:180]
            clean_triggers = when_to_use.split('\n')[0][:180]

            agent_prompt = f"""# Instruction Système — Skill : {title}
Identifiant : `{slug}`
Catégorie : {cat_label}

Tu es un agent d'élite expert sur le skill `{slug}`.
Tu dois appliquer rigoureusement les directives suivantes pour garantir une exécution sans défaut :

## 1. Définition & Rôle :
{definition[:300]}

## 2. Déclencheurs d'activation :
Activer immédiatement ce skill lorsque :
- {clean_triggers}
- L'utilisateur mentionne explicitement : `{slug}` ou `{title}`.

## 3. Protocole d'Exécution :
1. Analyse le contexte et inspecte le code existant avant toute action.
2. N'extrapole pas : respecte les contraintes et règles métier prescrites.
3. Valide le travail par des tests ou une vérification pas-à-pas selon la checklist du skill.
"""

            agent_config_snippet = f"""// Exemple d'affectation pour Cursor Rules (.cursor/rules/{slug}.mdc)
// ou Antigravity (.agents/skills/{slug}/SKILL.md)
---
name: "{slug}"
description: "{short_desc.replace('\"', '')}"
category: "{cat_key}"
globs: "**/*"
---

# Directives d'utilisation du skill {slug}
Dès que la tâche touche à {title.lower()}, réfère-toi aux instructions du skill :
- Applique les patterns recommandés.
- Assure la validation systématique.
"""

            skill_entry = {
                'id': slug,
                'name': title,
                'category': cat_key,
                'categoryLabel': cat_label,
                'categoryDescription': cat_desc,
                'subcategory': subcat,
                'description': fm_desc or (definition[:160] + '...'),
                'definition': definition,
                'whatItDoes': what_it_does,
                'whenToUse': when_to_use,
                'howToUse': how_to_use,
                'agentAssignment': {
                    'systemPrompt': agent_prompt.strip(),
                    'activationTrigger': clean_triggers.strip(),
                    'agentConfigSnippet': agent_config_snippet.strip()
                },
                'tags': tags,
                'contentMarkdown': raw
            }
            all_skills.append(skill_entry)

# Sort by category and name
all_skills.sort(key=lambda s: (s['category'], s['name']))

with open(DEST_JSON, 'w', encoding='utf-8') as f:
    json.dump(all_skills, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {len(all_skills)} skills into {DEST_JSON}!")
print(f"File size: {os.path.getsize(DEST_JSON) / 1024:.1f} KB")
