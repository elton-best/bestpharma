#!/usr/bin/env python3
"""Conversion contrôlée des anciens Word en XML DocBook, sans toucher aux sources.
Requiert antiword (commit 82515aad16ceedc1061ae3777acb99c90d3d3e08).
"""
import argparse, hashlib, json, os, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
p = argparse.ArgumentParser(); p.add_argument('--antiword', required=True); args = p.parse_args()
source = ROOT/'0000. DIGIT ABMEB'; sortie = ROOT/'references/canevas/anciens-doc'; sortie.mkdir(parents=True, exist_ok=True)
manifest = []
for f in sorted(source.rglob('*.doc')):
    chemin = f.relative_to(source).as_posix()
    id = hashlib.sha256(chemin.encode()).hexdigest()[:24]
    resultat = subprocess.run([args.antiword, '-x', 'db', str(f)], check=True, capture_output=True).stdout
    (sortie/(id+'.xml')).write_bytes(resultat)
    manifest.append({'fichier': chemin, 'sha256_source': hashlib.sha256(f.read_bytes()).hexdigest(), 'xml': id+'.xml', 'sha256_xml': hashlib.sha256(resultat).hexdigest()})
(sortie/'manifeste.json').write_text(json.dumps({'outil': 'antiword', 'commit': '82515aad16ceedc1061ae3777acb99c90d3d3e08', 'documents': manifest}, ensure_ascii=False, indent=2)+'\n')
print('Anciens fichiers Word convertis ; sources inchangées.')
