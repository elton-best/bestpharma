#!/usr/bin/env python3
"""Rapprochement documentaire pour relecture, sans import ni validation implicite."""
import argparse
from collections import Counter
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import unicodedata
import warnings
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '0000. DIGIT ABMEB'
SORTIE = ROOT / 'docs/rapprochement-corpus.json'
IGNORES = {'de', 'des', 'du', 'la', 'le', 'les', 'et', 'd', 'l', 'en', 'un', 'une', 'pro', 'for', 'enr', 'mop', 'procedure', 'procedures', 'v1', 'v01', 'docx'}


def normaliser(texte):
    texte = ''.join(c for c in unicodedata.normalize('NFKD', texte.lower()) if not unicodedata.combining(c))
    return ' '.join(mot for mot in re.findall(r'[a-z0-9]+', texte) if mot not in IGNORES)


def proximite(titre, fichier):
    a, b = normaliser(titre), normaliser(Path(fichier).stem)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    mots_a, mots_b = set(a.split()), set(b.split())
    return round(0.55 * len(mots_a & mots_b) / len(mots_a | mots_b) + 0.45 * SequenceMatcher(None, a, b).ratio(), 3)


def produire():
    classeurs = sorted((SOURCE / '1.MAITRISE DOCUMENTAIRE').glob('Inventaire*.xlsx'))
    if len(classeurs) != 1:
        raise ValueError('Un inventaire source unique est nécessaire.')
    inventaire = classeurs[0]
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        classeur = load_workbook(inventaire, read_only=True, data_only=True)
    documents = []
    codes = set()
    for ligne, valeurs in enumerate(classeur['Inventaire'].iter_rows(values_only=True), 1):
        code = str(valeurs[6] or '').strip()
        if not re.fullmatch(r'OKPE/(PRO|MOP|FOR|ENR)/[A-Z]+/\d+', code):
            continue
        if code in codes:
            raise ValueError(f'Code documentaire répété dans l’inventaire : {code}')
        codes.add(code)
        documents.append({
            'ligne_excel': ligne, 'code': code, 'titre': str(valeurs[5] or '').strip(),
            'processus_source': str(valeurs[3] or '').strip(), 'type': str(valeurs[4] or '').strip(),
            'version_source': str(valeurs[8] or '').strip(),
            'etat_source': str(valeurs[9] or '').strip(),
            'relecture_source': str(valeurs[10] or '').strip(),
            'statut_final_source': str(valeurs[11] or '').strip(),
        })
    classeur.close()
    fichiers = []
    for chemin in sorted(SOURCE.rglob('*')):
        if not chemin.is_file():
            continue
        relatif = chemin.relative_to(SOURCE).as_posix()
        fichiers.append({'chemin': relatif, 'sha256': hashlib.sha256(chemin.read_bytes()).hexdigest(),
            'role': 'illustration_hors_document' if chemin.suffix.lower() == '.png' else 'fichier_a_rapprocher'})
    for doc in documents:
        candidats = sorted(({'chemin': f['chemin'], 'score_nom': proximite(doc['titre'], f['chemin'])}
            for f in fichiers if f['role'] != 'illustration_hors_document'), key=lambda c: (-c['score_nom'], c['chemin']))
        doc['candidats'] = [c for c in candidats[:3] if c['score_nom'] >= 0.45]
        doc['decision'] = 'a_verifier' if doc['candidats'] else 'aucun_candidat_par_le_nom'
        doc['fichier_confirme'] = None
    sollicitations = Counter(c['chemin'] for d in documents for c in d['candidats'][:1])
    return {
        'statut': 'rapprochement_non_valide_non_importe',
        'inventaire': inventaire.relative_to(ROOT).as_posix(),
        'inventaire_sha256': hashlib.sha256(inventaire.read_bytes()).hexdigest(),
        'avertissement': 'Scores de proximité des noms uniquement. Aucun fichier confirmé, aucun document déclaré manquant. Les annexes incluses dans les procédures et les versions restent à vérifier. Les statuts du classeur ne sont pas des approbations applicatives.',
        'documents_inventories': len(documents), 'fichiers_disponibles': len(fichiers),
        'par_type': dict(sorted(Counter(d['type'] for d in documents).items())),
        'par_etat_source': dict(sorted(Counter(d['etat_source'] for d in documents).items())),
        'processus_sources': sorted({d['processus_source'] for d in documents}),
        'avec_candidats': sum(bool(d['candidats']) for d in documents),
        'sans_candidat_par_le_nom': sum(not d['candidats'] for d in documents),
        'fichiers_sollicites_plusieurs_fois': sorted(n for n, total in sollicitations.items() if total > 1),
        'documents': documents, 'fichiers': fichiers,
    }


def markdown(rapport):
    lignes = ['# Rapprochement du corpus — proposition à relire', '',
        rapport['avertissement'], '',
        f"Documents inventoriés : {rapport['documents_inventories']}. Fichiers disponibles : {rapport['fichiers_disponibles']}.", '',
        'Aucune ligne de ce tableau n’est prête à importer automatiquement. Examiner le fichier, son cartouche, son code, sa version et son statut avant confirmation. Un fichier peut contenir plusieurs annexes ; ne pas déduire le nombre de manquants par simple soustraction.', '',
        '| Code | Document de l’inventaire | Première piste par le nom | État du rapprochement |',
        '|---|---|---|---|']
    for doc in rapport['documents']:
        piste = doc['candidats'][0]['chemin'] if doc['candidats'] else 'Aucune piste par le nom'
        cellules = [doc['code'], doc['titre'], piste, 'À vérifier' if doc['candidats'] else 'À rechercher : fichier ou annexe']
        lignes.append('| ' + ' | '.join(c.replace('|', '\\|').replace('\n', ' ') for c in cellules) + ' |')
    return '\n'.join(lignes) + '\n'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rapport = produire()
    texte = markdown(rapport)
    if args.check:
        if json.loads(SORTIE.read_text()) != rapport or SORTIE.with_suffix('.md').read_text() != texte:
            raise SystemExit('Rapprochement différent des sources : contrôle en échec.')
    else:
        SORTIE.write_text(json.dumps(rapport, ensure_ascii=False, indent=2) + '\n')
        SORTIE.with_suffix('.md').write_text(texte)
    print(f"{rapport['documents_inventories']} lignes, {rapport['fichiers_disponibles']} fichiers, {rapport['avec_candidats']} lignes avec pistes ; aucune correspondance confirmée.")


if __name__ == '__main__':
    main()
