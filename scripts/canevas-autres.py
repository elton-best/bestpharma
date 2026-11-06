"""Liste de couverture ODT et PDF annoté : source modifiable et référence distinctes."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import xml.etree.ElementTree as ET
from pypdf import PdfReader
NS = {'office':'urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'text':'urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'table':'urn:oasis:names:tc:opendocument:xmlns:table:1.0'}
def local(n): return n.tag.rsplit('}',1)[-1]
def texte(n):
    if local(n)=='s': return ' '*int(n.get('{'+NS['text']+'}c','1'))
    if local(n)=='tab': return '\t'
    if local(n)=='line-break': return '\n'
    return (n.text or '')+''.join(texte(c)+(c.tail or '') for c in n)
def lignes_de_table(table):
    for enfant in table:
        if local(enfant) == 'table-row': yield enfant
        elif local(enfant) in ['table-header-rows', 'table-rows', 'table-row-group']:
            yield from lignes_de_table(enfant)
def extraire(source):
    result=[]
    for f in sorted(source.rglob('*')):
        if f.suffix.lower() not in ['.odt','.pdf']: continue
        chemin=f.relative_to(source).as_posix()
        c={'id':hashlib.sha256(chemin.encode()).hexdigest()[:24], 'titre':f.stem, 'rubrique':Path(chemin).parts[0], 'fichier':chemin,
           'sha256':hashlib.sha256(f.read_bytes()).hexdigest(), 'format':f.suffix[1:].lower(), 'images':{}, 'parties':[]}
        compteur=0
        def cle():
            nonlocal compteur
            compteur+=1
            return 'a'+str(compteur)
        if f.suffix.lower()=='.odt':
            with ZipFile(f) as z: body=ET.fromstring(z.read('content.xml')).find('office:body/office:text',NS)
            def lire(nodes):
                blocs=[]
                for n in nodes:
                    t=local(n)
                    if t in ['p','h']:
                        blocs.append({'cle':cle(),'type':'paragraphe','texte':texte(n),'gras':t=='h'})
                    elif t=='table':
                        lignes=[]
                        for row in lignes_de_table(n):
                            for _ in range(int(row.get('{'+NS['table']+'}number-rows-repeated','1'))):
                                cellules=[]
                                for cell in row:
                                    if local(cell)!='table-cell': continue
                                    for _ in range(int(cell.get('{'+NS['table']+'}number-columns-repeated','1'))):
                                        paragraphs=[texte(p) for p in cell.iter() if local(p) in ['p','h']]
                                        cellules.append({'cle':cle(),'texte':'\n'.join(paragraphs),'largeur':int(cell.get('{'+NS['table']+'}number-columns-spanned','1')),'hauteur':int(cell.get('{'+NS['table']+'}number-rows-spanned','1'))})
                                lignes.append(cellules)
                        blocs.append({'cle':cle(),'type':'tableau','lignes':lignes})
                    elif t in ['list','list-item','section']: blocs.extend(lire(n))
                return blocs
            c['parties']=[{'origine':'document','blocs':lire(body)}]
        else:
            c['usage']='reference';c['annotations']=[]
            for numero,page in enumerate(PdfReader(f).pages,1):
                blocs=[{'cle':cle(),'type':'paragraphe','texte':page.extract_text() or ''}]
                annots=page.get('/Annots');annots=annots.get_object() if annots else []
                for ref in annots:
                    a=ref.get_object()
                    if a.get('/Subtype')=='/Popup' or not a.get('/Contents'): continue
                    note={'page':numero,'texte':str(a['/Contents']),'type':str(a.get('/Subtype','')), 'rectangle':[float(x) for x in a.get('/Rect',[])]}
                    c['annotations'].append(note)
                    blocs.extend([{'cle':cle(),'type':'paragraphe','texte':'Annotation du document source','gras':True}, {'cle':cle(),'type':'paragraphe','texte':note['texte']}])
                c['parties'].append({'origine':'Page '+str(numero),'blocs':blocs})
        result.append(c)
    return result
