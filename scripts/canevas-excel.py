"""Transposition des feuilles modèles Excel, sans exécuter leurs formules."""
from datetime import date, datetime
from pathlib import Path
import hashlib, warnings, re
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
FEUILLES = {
 'Inventaire documentaire  PHARMACIE OKPE OLUWA.xlsx': ['Cartouche & légende','Inventaire'],
 'FOR & ENR  Plan de Formation.xlsx': ['FORMULAIRE'],
 'FOR & ENR-Gestion des Congés.xlsx': ['Consignes de remplissage','Formulaire'],
 "FOR & ENR-Plan de Nettoyage et d'Entretien ..xlsx": ['FORMULAIRE','TABLEAU DE SUIVI'],
 'FOR &ENR Inventaire des équipements.xlsx': ['Eléments de codification','Inventaire'],
 "FOR &ENR Plan de Maintenance et d'étalonnage des équipements.xlsx": ['FORMULAIRE'],
 'Plan de continuité_Pharmacie.xlsx': ['Cartouche & objectifs','Plan de continuité'],
 'Registre de Maintenance & Tests 2025.xlsx': ['FORMULAIRE'],
 'Registre de Maintenance & Tests 2026.xlsx': ['Formulaire 1','Formulaire 2'],
 "FOR &ENR-Plan d'Actions du SMQ.xlsx": ['Plan'],
 'FOR-Plan de Maîtrise des Risques et Opportunités.xlsx': ['Cartouche & grille','PMRO-1'],
 'FOR-Tableau de Suivi des Améliorations du SMQ.xlsx': ['Formulaire'],
 'Tableau de maîtrise des risques et opportunités.xlsx': ['Plan de maîtrise_Risq & Opp ','Matrice_Risq & Opp.'],
 'PLANNING DU PERSONNEL MODEL.xlsx': ['Feuil1'],
 'Quelques plans de la pharmacie OKPE OLUWA.xlsx': ['Plan SMQ','Plan Mainte...','Plan de formation','Gestion des congés','Plan de netoyage & entretien','Inventaires des équipements','Base des prestataires'],
}
def extraire(source):
    resultat = []
    for f in sorted(source.rglob('*.xlsx')):
        chemin = f.relative_to(source).as_posix()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            wb = load_workbook(f, data_only=False)
            valeurs = load_workbook(f, data_only=True)
        parties = []; compteur = 0
        for nom in FEUILLES[f.name]:
            ws = wb[nom]; cache = valeurs[nom]
            non_vides = [cell for row in ws for cell in row if cell.value is not None]
            if not non_vides: continue
            limite = max(c.row for c in non_vides) + 2
            colonnes = max(c.column for c in non_vides)
            for fusion in ws.merged_cells.ranges:
                if fusion.min_row <= limite: colonnes = max(colonnes, fusion.max_col)
            # Conserver toutes les lignes de la zone utilisée, ainsi que des lignes
            # vides à compléter ; ne pas importer des milliers de lignes formatées.
            limite = ws.max_row if ws.max_row <= 150 else min(max(limite, 12), ws.max_row)
            ancres = {}; couverts = set()
            for fusion in ws.merged_cells.ranges:
                ancres[(fusion.min_row, fusion.min_col)] = (fusion.max_row-fusion.min_row+1, fusion.max_col-fusion.min_col+1)
                for row in range(fusion.min_row, min(fusion.max_row, limite)+1):
                    for col in range(fusion.min_col, fusion.max_col+1):
                        if (row,col)!=(fusion.min_row,fusion.min_col): couverts.add((row,col))
            lignes=[]
            for row in range(1,limite+1):
                ligne=[]
                for col in range(1,colonnes+1):
                    if (row,col) in couverts: continue
                    cell=ws.cell(row,col); value=cache.cell(row,col).value if cell.data_type=='f' else cell.value
                    if isinstance(value,(date,datetime)): value=value.strftime('%d/%m/%Y')
                    elif isinstance(value,bool): value='Oui' if value else 'Non'
                    elif value is None: value=''
                    else: value=str(value)
                    compteur+=1; hauteur,largeur=ancres.get((row,col),(1,1))
                    c={'cle':f'x{compteur}', 'texte':value, 'largeur':largeur, 'hauteur':min(hauteur,limite-row+1), 'adresse':cell.coordinate, 'gras':bool(cell.font.bold)}
                    if cell.data_type=='f':
                        c['calcul_a_verifier']=True
                        simple=re.fullmatch(r'=([A-Z]+[0-9]+)([+*/-])([A-Z]+[0-9]+)',cell.value or '')
                        if simple:
                            c['calcul']={'gauche':simple[1],'operateur':simple[2],'droite':simple[3]}
                            c['calcul_a_verifier']=False
                    if cell.fill.fgColor.type=='rgb' and cell.fill.fgColor.rgb and cell.fill.fgColor.rgb!='00000000': c['fond']='#'+cell.fill.fgColor.rgb[-6:]
                    ligne.append(c)
                lignes.append(ligne)
            parties.append({'origine':nom,'blocs':[{'cle':'feuille-'+str(len(parties)), 'type':'tableau', 'largeurs':[max(1, int((ws.column_dimensions[get_column_letter(c)].width or 13)*100)) for c in range(1,colonnes+1)], 'lignes':lignes}]})
        wb.close(); valeurs.close()
        resultat.append({'id':hashlib.sha256(chemin.encode()).hexdigest()[:24], 'titre':f.stem,'rubrique':f.relative_to(source).parts[0],
            'fichier':chemin,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(), 'format':'xlsx', 'parties':parties,'images':{},
            'feuilles_integrees':[p['origine'] for p in parties], 'formules_recalculees':False})
    return resultat
