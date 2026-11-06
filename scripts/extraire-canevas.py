#!/usr/bin/env python3
"""Canevas Word : ordre des paragraphes, tableaux, fusions et pièces graphiques.
Ne réécrit jamais le corpus. Les DOC binaires et classeurs restent à traiter.
"""
import argparse, base64, hashlib, json, re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / '0000. DIGIT ABMEB'
SORTIE = ROOT / 'references/canevas/catalogue.json'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def tag(n): return n.tag.rsplit('}', 1)[-1]
def texte(n):
    return ''.join((t.text or '') if tag(t) == 't' else '\n' if tag(t) in ['br', 'cr'] else '\t' if tag(t) == 'tab' else '' for t in n.iter())
def images_dans(n, z, relations, images):
    ids = []
    for blip in n.findall('.//a:blip', NS):
        cible = relations.get(blip.get('{'+NS['r']+'}embed'))
        if not cible or cible not in z.namelist(): continue
        data = z.read(cible)
        mime = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif'}.get(Path(cible).suffix.lower())
        if mime:
            image = hashlib.sha256(data).hexdigest()
            images[image] = 'data:'+mime+';base64,'+base64.b64encode(data).decode()
            ids.append(image)
    return ids
def produire():
    result = []
    for f in sorted(SOURCE.rglob('*.docx')):
        cle = hashlib.sha256(f.relative_to(SOURCE).as_posix().encode()).hexdigest()[:24]
        index = 0
        images = {}
        def bloc(n, z, relations):
            nonlocal index
            index += 1
            b = {'cle': f'b{index}', 'type': 'tableau' if tag(n) == 'tbl' else 'paragraphe'}
            if tag(n) == 'tbl':
                b['largeurs'] = [int(col.get('{'+NS['w']+'}w', '1')) for col in n.findall('w:tblGrid/w:gridCol', NS)]
                lignes, actifs = [], {}
                for tr in n.findall('w:tr', NS):
                    cells, col = [], 0
                    for tc in tr.findall('w:tc', NS):
                        span = tc.find('w:tcPr/w:gridSpan', NS)
                        span = int(span.get('{'+NS['w']+'}val', '1')) if span is not None else 1
                        merge = tc.find('w:tcPr/w:vMerge', NS)
                        if merge is not None and merge.get('{'+NS['w']+'}val') != 'restart' and col in actifs:
                            actifs[col]['hauteur'] += 1
                            if texte(tc).strip(): actifs[col]['texte'] += '\n'+texte(tc)
                        else:
                            index += 1
                            cell = {'cle': f'b{index}', 'texte': '\n'.join(texte(p) for p in tc.findall('w:p', NS)), 'largeur': span, 'hauteur': 1, 'images': images_dans(tc, z, relations, images)}
                            # Conserver aussi le contenu textuel de rares tableaux imbriqués.
                            nested = tc.findall('w:tbl', NS)
                            if nested: cell['imbriques'] = [bloc(t, z, relations) for t in nested]
                            cells.append(cell)
                            if merge is not None: actifs[col] = cell
                            else: actifs.pop(col, None)
                        col += span
                    lignes.append(cells)
                b['lignes'] = lignes
            else:
                b['texte'] = texte(n)
                align = n.find('w:pPr/w:jc', NS)
                b['alignement'] = align.get('{'+NS['w']+'}val', 'left') if align is not None else 'left'
                b['gras'] = any(t.find('w:rPr/w:b', NS) is not None for t in n.findall('w:r', NS))
                b['images'] = images_dans(n, z, relations, images)
            return b
        with ZipFile(f) as z:
            parties = []
            for nom in sorted(z.namelist(), key=lambda n: (0 if '/header' in n else 2 if '/footer' in n else 1, n)):
                if not re.fullmatch(r'word/(document|header\d+|footer\d+)\.xml', nom): continue
                rel = f'word/_rels/{Path(nom).name}.rels'
                relations = {}
                if rel in z.namelist():
                    for r in ET.fromstring(z.read(rel)):
                        target = r.get('Target', '')
                        if target.startswith('media/'): relations[r.get('Id')] = 'word/'+target
                root = ET.fromstring(z.read(nom))
                parent = root.find('w:body', NS) if nom == 'word/document.xml' else root
                parties.append({'origine': Path(nom).stem, 'blocs': [bloc(n, z, relations) for n in parent if tag(n) in ['p', 'tbl']]})
            result.append({'id': cle, 'titre': f.stem, 'rubrique': f.relative_to(SOURCE).parts[0],
                'fichier': f.relative_to(SOURCE).as_posix(), 'sha256': hashlib.sha256(f.read_bytes()).hexdigest(),
                'parties': parties, 'images': images})
    # Les conversions sont versionnées avec l'empreinte de la source binaire et
    # de l'XML. La CI n'a donc pas besoin d'un convertisseur installé au runtime.
    anciens = ROOT/'references/canevas/anciens-doc'
    for doc in json.loads((anciens/'manifeste.json').read_text())['documents']:
        f = SOURCE/doc['fichier']; xml = (anciens/doc['xml']).read_bytes()
        if hashlib.sha256(f.read_bytes()).hexdigest() != doc['sha256_source'] or hashlib.sha256(xml).hexdigest() != doc['sha256_xml']:
            raise ValueError('Conversion DOC désalignée : '+doc['fichier'])
        index = 0
        blocs = []
        def cle():
            nonlocal index
            index += 1
            return f'b{index}'
        root = ET.fromstring(xml)
        def lire(elements):
            sortie = []
            for n in elements:
                if n.tag in ['informaltable', 'table']:
                    for group in n.findall('tgroup'):
                        largeurs = [round(float(col.get('colwidth', '1pt').replace('pt', '')) * 20) for col in group.findall('colspec')]
                        lignes = []
                        for row in group.findall('.//row'):
                            lignes.append([{'cle': cle(), 'texte': ''.join(cell.itertext()).strip('\n'), 'largeur': 1, 'hauteur': 1} for cell in row.findall('entry')])
                        sortie.append({'cle': cle(), 'type': 'tableau', 'largeurs': largeurs, 'lignes': lignes})
                elif n.tag in ['para', 'title']:
                    tables = list(n.findall('informaltable')) + list(n.findall('table'))
                    if tables:
                        debut = (n.text or '').strip()
                        if debut: sortie.append({'cle': cle(), 'type': 'paragraphe', 'texte': debut})
                        sortie.extend(lire(tables))
                    else:
                        sortie.append({'cle': cle(), 'type': 'paragraphe', 'texte': ''.join(n.itertext()).strip('\n'), 'gras': n.tag == 'title'})
                else: sortie.extend(lire(list(n)))
            return sortie
        for chapter in root.findall('chapter'): blocs.extend(lire(list(chapter)))
        result.append({'id': hashlib.sha256(doc['fichier'].encode()).hexdigest()[:24], 'titre': f.stem,
            'rubrique': Path(doc['fichier']).parts[0], 'fichier': doc['fichier'], 'sha256': doc['sha256_source'],
            'conversion': 'antiword_docbook', 'parties': [{'origine': 'document', 'blocs': blocs}], 'images': {}})
    result.sort(key=lambda c: c['fichier'])
    return {'schema': 'begpharma.canevas.v1', 'canevas': result,
            'non_integres': [f.relative_to(SOURCE).as_posix() for f in sorted(SOURCE.rglob('*')) if f.suffix.lower() in ['.xlsx', '.odt', '.pdf']]}
def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    contenu = json.dumps(produire(), ensure_ascii=False, indent=2)+'\n'
    if args.check:
        if not SORTIE.exists() or SORTIE.read_text() != contenu: raise SystemExit('Canevas à régénérer : python scripts/extraire-canevas.py')
        print('Canevas Word alignés sur le corpus.'); return
    SORTIE.parent.mkdir(parents=True, exist_ok=True); SORTIE.write_text(contenu)
    print('Canevas Word extraits sans modification des sources.')
if __name__ == '__main__': main()
