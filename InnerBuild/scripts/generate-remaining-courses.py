import urllib.request
import json
import os
import time

API_KEY = "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"
URL = "https://api.groq.com/openai/v1/chat/completions"
DEST_FILE = "/home/elton/ai-factory-99102579/src/data/skills-courses.json"

REMAINING_SKILLS = [
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
    }
]

def generate_skill(skill):
    print(f"Generating course for {skill['id']} using openai/gpt-oss-120b...")
    system_prompt = f"""Tu es le Directeur Pédagogique et Principal Architect de l'académie de pointe AI Factory.
Tu rédiges des formations d'ingénierie logicielle d'élite, exhaustives, denses, pratiques et de très haut niveau en français.

Tu dois répondre STRICTEMENT sous forme de JSON valide avec le schéma :
{{
  "skillId": "{skill['id']}",
  "courseTitle": "Titre complet du cours",
  "subtitle": "Sous-titre percutant et professionnel",
  "domain": "{skill['domain']}",
  "estimatedHours": 4,
  "level": "Intermédiaire à Avancé",
  "overview": "Présentation longue et contextualisée du cours (au moins 200 mots)",
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
      "readingMinutes": 25,
      "theoreticalFoundation": "Explication théorique exhaustive, détaillée et profonde",
      "architecturalPatterns": "Architecture technique détaillée, arborescence et conventions",
      "codeImplementation": "Exemple de code complet TypeScript strict, commenté et sans omission",
      "agentCollaborationGuide": "Directives précises pour guider un agent IA (Cursor, Claude Code)",
      "practicalLab": {{
        "title": "Titre de l'atelier pratique",
        "objective": "Objectif clair et mesurable",
        "steps": ["Étape 1", "Étape 2", "Étape 3"],
        "validationCriteria": "Critères précis de réussite",
        "solutionWalkthrough": "Guide pas-à-pas de la solution"
      }},
      "quiz": [
        {{
          "question": "Question technique précise",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Explication technique détaillée de la bonne réponse"
        }}
      ]
    }}
  ]
}}

Consignes : Rédige 3 chapitres riches et complets en français."""

    user_prompt = f"Rédige le cours complet d'ingénierie logicielle pour le skill : {skill['name']}.\nDescription : {skill['tagline']}.\nPoints clés : {json.dumps(skill['focus_areas'], ensure_ascii=False)}"

    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 4000,
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

    with urllib.request.urlopen(req, timeout=120) as response:
        result = json.loads(response.read().decode("utf-8"))
        raw = result["choices"][0]["message"]["content"]
        parsed = json.loads(raw)
        print(f"SUCCESS for {skill['id']}! Chapters count: {len(parsed.get('chapters', []))}")
        return parsed

def main():
    with open(DEST_FILE, "r", encoding="utf-8") as f:
        existing = json.load(f)

    for skill in REMAINING_SKILLS:
        if skill["id"] in existing and len(existing[skill["id"]].get("chapters", [])) >= 2:
            print(f"Skill {skill['id']} already present.")
            continue
        try:
            course = generate_skill(skill)
            if course:
                existing[skill["id"]] = course
                with open(DEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2)
                print(f"Saved {skill['id']} to {DEST_FILE}!")
        except Exception as e:
            print(f"Failed for {skill['id']}: {e}")
        time.sleep(5)

    print(f"All done! Total courses: {len(existing)}")

if __name__ == "__main__":
    main()
