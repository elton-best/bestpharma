#!/usr/bin/env python3
"""Extraction traçable, sans réécriture, pour relecture avant import métier.
Usage : python scripts/extraire-referentiel-abmed.py [--check]
Dépendance : pip install -r scripts/requirements-referentiel.txt
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'references/abmed/guide-bpdisp.pdf'
SORTIE = ROOT / 'references/abmed/extraction/articles-a-relire.json'
ATTENDUS = [31, 21, 31, 38, 27, 17, 75, 13, 5, 9]
MOTIF = re.compile(r'^\s*(10|[1-9])\.(\d+)\.\s+', re.MULTILINE)


def extraire():
    reader = PdfReader(SOURCE)
    pages = []
    for i, page in enumerate(reader.pages):
        lignes = (page.extract_text() or '').splitlines()
        # Retirer uniquement les lignes vides et le folio imprimé isolé.
        # Les titres/intertitres sont conservés : aucune suppression sémantique automatique.
        texte = '\n'.join(l.rstrip() for l in lignes if l.strip() and not re.fullmatch(r'\s*\d+\s*', l))
        pages.append((i + 1, texte))
    tout = ''
    bornes = []
    for numero, texte in pages:
        debut = len(tout)
        tout += texte + '\n'
        bornes.append((numero, debut, len(tout)))
    marqueurs = list(MOTIF.finditer(tout))
    articles = []
    for i, match in enumerate(marqueurs):
        fin = marqueurs[i + 1].start() if i + 1 < len(marqueurs) else len(tout)
        texte = tout[match.end():fin].strip()
        pages_source = [n for n, debut, stop in bornes if debut < fin and stop > match.start()]
        articles.append({
            'numero': f'{match[1]}.{match[2]}', 'chapitre': int(match[1]),
            'pages_pdf': pages_source, 'texte_extrait': texte,
            'statut': 'a_relire',
        })
    codes = [a['numero'] for a in articles]
    attendus = [f'{c}.{n}' for c, total in enumerate(ATTENDUS, 1) for n in range(1, total + 1)]
    if codes != attendus:
        raise ValueError('Numérotation absente, répétée ou hors séquence : import interdit.')
    if any(not a['texte_extrait'] for a in articles):
        raise ValueError('Un article est vide : import interdit.')
    return {
        'statut': 'extraction_a_relire_non_importee',
        'source': 'references/abmed/guide-bpdisp.pdf',
        'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'decision': 'ABMED/2025D/1310/ABMed/CJ/DIRP/SA du 26/02/2025',
        'pages_pdf': len(reader.pages),
        'outil': 'pypdf 7.0.0',
        'avertissement': 'Segments textuels non validés métier. Les intertitres peuvent être inclus à la fin des segments ; conserver le PDF comme autorité. Aucun article ni score existant n’a été modifié.',
        'total_articles': len(articles),
        'repartition': dict(sorted(Counter(str(a['chapitre']) for a in articles).items(), key=lambda x: int(x[0]))),
        'articles': articles,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='Vérifier la reproductibilité sans écrire')
    args = parser.parse_args()
    resultat = extraire()
    if args.check:
        if json.loads(SORTIE.read_text()) != resultat:
            raise SystemExit('Extraction différente de la source : contrôle en échec.')
        print('Contrôle réussi : empreinte, séquence et extraction reproductible.')
    else:
        SORTIE.parent.mkdir(parents=True, exist_ok=True)
        SORTIE.write_text(json.dumps(resultat, ensure_ascii=False, indent=2) + '\n')
        print(f"{resultat['total_articles']} articles extraits pour relecture, sans import en base.")


if __name__ == '__main__':
    main()
