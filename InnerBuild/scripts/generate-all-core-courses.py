import urllib.request
import json
import os
import sys
import time

API_KEY = "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"
URL = "https://api.groq.com/openai/v1/chat/completions"
DEST_FILE = "/home/elton/ai-factory-99102579/src/data/skills-courses.json"

CORE_SKILLS_BRIEFS = [
    {
        "id": "orchestrator",
        "name": "Skill Orchestrator — Autonomous Delivery Loop",
        "domain": "Orchestration & Méthodologie IA",
        "tagline": "Chef d'orchestre autonome, découpage de spec en micro-tâches, boucle de livraison et gating",
        "focus_areas": [
            "Cycle autonome complet : Spécification -> PLAN.md -> ROUTER.md -> Exécution atomique -> PROGRESS.md -> Review -> Gate de validation",
            "Découpage chirurgical d'un projet : EPIC vers Tasks unitaires (≤ 2 heures chacune)",
            "Supervision d'agents IA (Cursor, Claude Code, Antigravity) et routage vers les skills spécialisés",
            "Gestion des blocages, détection des régressions et validation formelle de la checklist Done"
        ]
    },
    {
        "id": "frontend-react",
        "name": "Skill Frontend React — React + Vite + TS + Tailwind",
        "domain": "Frontend & Architecture UI",
        "tagline": "React 18/19, Vite, TypeScript strict, TanStack Query, architecture modulaire et zéro 'any'",
        "focus_areas": [
            "Architecture moderne en couches : components/ui (tokens), components (métier), pages (routes), lib/api (clients typés)",
            "Data fetching professionnel avec TanStack Query v5 : mise en cache, invalidation, mutations et élimination des useEffect sauvages",
            "Gestion de formulaires ultra-robuste avec React Hook Form et validation Zod de bout en bout",
            "Typage strict TypeScript sans aucun 'any', gestion des états globaux et optimisations de rendu"
        ]
    },
    {
        "id": "backend-node",
        "name": "Skill Backend Node — Fastify + TS + Zod + Prisma",
        "domain": "Backend, API & Microservices",
        "tagline": "APIs Node 20+ ultra-rapides, validation d'entrée/sortie Zod, Prisma ORM et sécurité",
        "focus_areas": [
            "Architecture en couches Fastify : routes (définition pure), services (logique métier), schemas (Zod), plugins (auth, CORS, rate-limit)",
            "Validation absolue en entrée (body, query, params) et en sortie (response serialization sécurisée)",
            "Accès aux données haute performance avec Prisma ORM, migrations maîtrisées et gestion des transactions",
            "Gestion des erreurs centralisée, journalisation structurée avec Pino et protection contre les pannes"
        ]
    },
    {
        "id": "agents-ai",
        "name": "Skill Agents-AI — Fonctionnalités LLM Sûres & Évaluées",
        "domain": "Intelligence Artificielle & Systèmes Autonomes",
        "tagline": "Prompt engineering, RAG contextuel, tool-calling structuré, boucles d'agents et evals",
        "focus_areas": [
            "Conception d'agents autonomes : boucles ReAct (Reason + Act), mémoire à court/long terme et budget de tokens",
            "Tool-calling et intégration de fonctions : schémas JSON stricts, exécution sécurisée et gestion des erreurs de parsing",
            "RAG (Retrieval Augmented Generation) : découpage de documents (chunking), embeddings vectoriels et recherche sémantique",
            "Automatisation de navigateur (agent-browser headless via CDP) et benchmarks d'évaluation (Evals) continus"
        ]
    },
    {
        "id": "qa-devops",
        "name": "Skill QA-DevOps — Qualité et Livraison sans Faille",
        "domain": "QA, Tests & Déploiement Continu",
        "tagline": "Stratégie de tests pyramidale (Vitest, Playwright), gate bloquant, conteneurisation et CI/CD",
        "focus_areas": [
            "Pyramide des tests : tests unitaires rapides avec Vitest, tests d'intégration API et tests End-to-End avec Playwright",
            "Le principe du Gate Bloquant : aucun déploiement sans passage de la suite (lint, typecheck, tests, build)",
            "Conteneurisation Docker multi-stage optimisée et configuration de pipelines CI/CD (GitHub Actions)",
            "Déploiements éphémères (preview branches), monitoring de production et rollbacks automatisés"
        ]
    },
    {
        "id": "design-system",
        "name": "Skill Design-System — Cohérence Visuelle & Accessibilité",
        "domain": "Design System & Ergonomie",
        "tagline": "Design tokens, hiérarchie visuelle Refactoring UI, atomic design et accessibilité WCAG",
        "focus_areas": [
            "Système de design tokens : échelles typographiques mathématiques, palettes de couleurs contrastées et espacements cohérents",
            "Hiérarchie visuelle sans compromis : différenciation primaire/secondaire/tertiaire, élimination du désordre visuel",
            "Conception de bibliothèques de composants accessibles (WCAG 2.1 AA, support clavier, screen readers)",
            "Thématisation sombre/claire (dark mode) sans flash et documentation vivante des composants"
        ]
    },
    {
        "id": "security",
        "name": "Skill Security — Gate Bloquant AppSec & Audits",
        "domain": "Cybersécurité Applicative",
        "tagline": "Protection OWASP Top 10, sanitization des entrées, authentification JWT/RLS et secrets management",
        "focus_areas": [
            "Menaces OWASP Top 10 : prévention des injections SQL/NoSQL, XSS, CSRF, SSRF et failles de logique métier",
            "Authentification et contrôle d'accès : tokens JWT sécurisés (HttpOnly, Secure, SameSite) et Row Level Security (RLS)",
            "Gestion étanche des secrets d'environnement, rotation des clés et audits de dépendances (npm audit, Snyk)",
            "En-têtes HTTP de sécurité obligatoires (CSP, HSTS, X-Content-Type-Options) et checklist bloquante pré-livraison"
        ]
    }
]

def generate_course_for_skill(skill):
    print(f"\n==================================================")
    print(f"Generating full course for: {skill['name']} ({skill['id']})...")

    system_prompt = f"""Tu es le Directeur Pédagogique et Principal Architect de l'académie de pointe AI Factory.
Tu rédiges des formations d'ingénierie logicielle d'élite, exhaustives, longues, denses, pratiques et de très haut niveau en français.
Ton objectif est de former des développeurs capables de concevoir des systèmes de calibre mondial avec les agents IA.

Tu dois répondre STRICTEMENT sous forme de JSON valide avec le schéma suivant :
{{
  "skillId": "{skill['id']}",
  "courseTitle": "Titre complet du cours",
  "subtitle": "Sous-titre percutant et professionnel",
  "domain": "{skill['domain']}",
  "estimatedHours": 4,
  "level": "Intermédiaire à Avancé",
  "overview": "Présentation longue, détaillée et contextualisée du cours (au moins 200 mots)",
  "prerequisites": ["Prérequis technique 1", "Prérequis technique 2", "Prérequis technique 3"],
  "learningOutcomes": [
    "Compétence concrète 1 acquise à la fin",
    "Compétence concrète 2 acquise à la fin",
    "Compétence concrète 3 acquise à la fin",
    "Compétence concrète 4 acquise à la fin"
  ],
  "chapters": [
    {{
      "chapterNumber": 1,
      "title": "Titre du Chapitre",
      "readingMinutes": 30,
      "theoreticalFoundation": "Explication théorique exhaustive, détaillée et profonde (pourquoi cette approche, modèles mentaux, analogies techniques, impact en production)",
      "architecturalPatterns": "Architecture technique détaillée, arborescence de fichiers recommandée, conventions et séparation des responsabilités",
      "codeImplementation": "Exemple de code complet, moderne, TypeScript strict, commenté et sans omission (pas de '...', code complet)",
      "agentCollaborationGuide": "Directives précises pour guider un agent IA (Cursor, Claude Code, Antigravity) sur les concepts de ce chapitre",
      "practicalLab": {{
        "title": "Titre de l'atelier pratique",
        "objective": "Objectif clair et mesurable",
        "steps": [
          "Étape 1 détaillée",
          "Étape 2 détaillée",
          "Étape 3 détaillée"
        ],
        "validationCriteria": "Critères précis pour valider la réussite de l'exercice",
        "solutionWalkthrough": "Guide pas-à-pas de la solution idéale"
      }},
      "quiz": [
        {{
          "question": "Question technique précise",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Explication technique détaillée de la bonne réponse et des pièges des autres options"
        }},
        {{
          "question": "Seconde question technique de mise en situation",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 1,
          "explanation": "Explication technique approfondie"
        }}
      ]
    }}
  ]
}}

Consignes :
1. Rédige 3 chapitres denses et complets.
2. Chaque chapitre doit être long, pédagogique, concret et rempli d'enseignements pratiques.
3. Rédige en français avec une précision d'ingénieur senior."""

    user_prompt = f"""Rédige le cours complet d'ingénierie logicielle pour le skill :
Nom : {skill['name']}
Identifiant : {skill['id']}
Domaine : {skill['domain']}
Description : {skill['tagline']}
Points clés à couvrir impérativement :
{json.dumps(skill['focus_areas'], ensure_ascii=False, indent=2)}

Fournis un cours dense, structuré, professionnel et immédiatement applicable."""

    model_name = "qwen/qwen3.8-27b"
    max_retries = 5

    for attempt in range(1, max_retries + 1):
        try:
            print(f"Calling Groq (attempt {attempt}/{max_retries}) with model {model_name}...")
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 5000,
                "temperature": 0.4,
                "response_format": {"type": "json_object"}
            }

            req = urllib.request.Request(
                URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0"
                }
            )

            with urllib.request.urlopen(req, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                raw_content = result["choices"][0]["message"]["content"]
                parsed = json.loads(raw_content)
                print(f"SUCCESS! Chapters count: {len(parsed.get('chapters', []))}")
                return parsed

        except urllib.error.HTTPError as e:
            print(f"HTTP Error {e.code}: {e.reason}")
            if e.code == 429:
                wait_time = 15 * attempt
                print(f"Rate limited (429). Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                time.sleep(5)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

    print(f"ERROR: Could not generate course for {skill['id']}")
    return None

def main():
    existing_courses = {}
    if os.path.exists(DEST_FILE):
        try:
            with open(DEST_FILE, "r", encoding="utf-8") as f:
                existing_courses = json.load(f)
        except Exception:
            existing_courses = {}

    for skill in CORE_SKILLS_BRIEFS:
        if skill["id"] in existing_courses and len(existing_courses[skill["id"]].get("chapters", [])) >= 2:
            print(f"Skipping {skill['id']} (already generated with {len(existing_courses[skill['id']]['chapters'])} chapters).")
            continue

        course_data = generate_course_for_skill(skill)
        if course_data:
            existing_courses[skill["id"]] = course_data
            with open(DEST_FILE, "w", encoding="utf-8") as f:
                json.dump(existing_courses, f, ensure_ascii=False, indent=2)
            print(f"Saved course for {skill['id']} into {DEST_FILE}!")
        time.sleep(10) # 10s cooldown between skills to respect rate limit

    print("\nALL 7 CORE SKILLS COURSES GENERATED SUCCESSFULLY!")
    print(f"Total courses in file: {len(existing_courses)}")

if __name__ == "__main__":
    main()
