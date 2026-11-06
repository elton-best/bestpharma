#!/usr/bin/env python3
"""Manifeste source-first : aucun rapprochement approximatif n'est activé."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import warnings
from openpyxl import load_workbook
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '0000. DIGIT ABMEB'
SORTIE = ROOT / 'docs/manifeste-import-corpus.json'
spec = importlib.util.spec_from_file_location('rapprochement', Path(__file__).with_name('rapprocher-corpus.py'))
rapprochement = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rapprochement)
MOTIF = re.compile(r'OKPE\s*[/_-]\s*(PRO|MOP|FOR|ENR)\s*[/_-]\s*([A-Z]{2,5})\s*[/_-]\s*(\d{1,4})(?!\d)')


def codes_dans(chemin):
    ext = chemin.suffix.lower()
    texte = ''
    if ext == '.docx':
        with ZipFile(chemin) as z:
            for nom in sorted(z.namelist()):
                if re.fullmatch(r'word/(document|header\d+|footer\d+)\.xml', nom):
                    texte += ' '.join(n.text or '' for n in ET.fromstring(z.read(nom)).iter() if n.tag.endswith('}t')) + '\n'
    elif ext == '.odt':
        with ZipFile(chemin) as z:
            texte = ' '.join(ET.fromstring(z.read('content.xml')).itertext())
    elif ext == '.xlsx':
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            w = load_workbook(chemin, read_only=True, data_only=True)
            for feuille in w:
                for ligne in feuille.iter_rows(values_only=True):
                    texte += ' '.join(str(v) for v in ligne if isinstance(v, str)) + '\n'
            w.close()
    elif ext == '.pdf':
        texte = '\n'.join(p.extract_text() or '' for p in PdfReader(chemin).pages)
    elif ext == '.doc':
        return [], 'ancien_format_non_extrait'
    else:
        raise ValueError(f'Format documentaire non prévu : {ext}')
    return sorted({f'OKPE/{m[1]}/{m[2]}/{m[3]}' for m in MOTIF.finditer(texte)}), 'codes_reperes_non_attribues'


def produire():
    rapport = rapprochement.produire()
    codes_inventaire = {d['code'] for d in rapport['documents']}
    fichiers = []
    exclus = []
    for f in rapport['fichiers']:
        if f['role'] == 'illustration_hors_document':
            exclus.append({'chemin': f['chemin'], 'motif': 'illustration_non_documentaire', 'sha256': f['sha256']})
            continue
        codes, lecture = codes_dans(SOURCE / f['chemin'])
        fichiers.append({
            'chemin': f['chemin'], 'sha256': f['sha256'],
            'cle_source': hashlib.sha256((f['chemin'] + '\n' + f['sha256']).encode()).hexdigest(),
            'octets': (SOURCE / f['chemin']).stat().st_size,
            'titre_source': Path(f['chemin']).stem,
            'codes_reperes': codes, 'codes_connus_inventaire': sorted(set(codes) & codes_inventaire),
            'codes_absents_inventaire': sorted(set(codes) - codes_inventaire),
            'lecture': lecture, 'code_documentaire_confirme': None,
            'mode_import': 'source_a_verifier',
        })
    return {'schema': 'begpharma.corpus.sources.v1',
        'statut': 'pret_pour_import_sources_non_approuvees',
        'inventaire_sha256': rapport['inventaire_sha256'],
        'regle': 'Un fichier source donne une fiche brouillon identifiée SRC, jamais une approbation. Les codes repérés peuvent être des références à d’autres documents : aucune attribution automatique.',
        'documents_inventories': rapport['documents'], 'fichiers': fichiers, 'exclus': exclus,
        'bilan': {'lignes_inventaire': len(rapport['documents']), 'fichiers_a_importer': len(fichiers),
            'fichiers_exclus': len(exclus), 'anciens_doc_non_extraits': sum(f['lecture'] == 'ancien_format_non_extrait' for f in fichiers),
            'fichiers_avec_codes_absents_inventaire': sum(bool(f['codes_absents_inventaire']) for f in fichiers)}}



def rapport_markdown(m):
    lignes = ['# Lot d’import des sources documentaires', '',
        'Les fichiers sont préparés comme pièces sources privées et brouillons, sans attribution automatique aux lignes de l’inventaire. Les codes extraits peuvent être des références citées et non le code du document.', '',
        f"Inventaire : {len(m['documents_inventories'])} lignes. Dépôt préparé : {len(m['fichiers'])} fichiers. Illustration exclue : {len(m['exclus'])}.", '',
        '| Fichier | Codes repérés | Points à vérifier |', '|---|---|---|']
    for f in m['fichiers']:
        codes = ', '.join(f['codes_reperes']) or 'Aucun code extrait'
        note = 'Ancien format : lecture manuelle nécessaire' if f['lecture'] == 'ancien_format_non_extrait' else 'Cartouche, références et version à vérifier'
        if f['codes_absents_inventaire']:
            note += ' ; codes absents de l’inventaire : ' + ', '.join(f['codes_absents_inventaire'])
        lignes.append('| ' + ' | '.join(x.replace('|', '\\|').replace('\n', ' ') for x in [f['chemin'], codes, note]) + ' |')
    return '\n'.join(lignes) + '\n'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    resultat = produire()
    rapport = rapport_markdown(resultat)
    if args.check:
        if json.loads(SORTIE.read_text()) != resultat or SORTIE.with_suffix(".md").read_text() != rapport:
            raise SystemExit('Manifeste différent des sources : import à re-préparer.')
    else:
        SORTIE.write_text(json.dumps(resultat, ensure_ascii=False, indent=2) + '\n')
        SORTIE.with_suffix('.md').write_text(rapport)
    print(json.dumps(resultat['bilan'], ensure_ascii=False))


if __name__ == '__main__':
    main()
