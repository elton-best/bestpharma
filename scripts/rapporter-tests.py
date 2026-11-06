#!/usr/bin/env python3
"""Publie les échecs PHPUnit en annotations accessibles sans télécharger les journaux."""
from pathlib import Path
import xml.etree.ElementTree as ET
p = Path('backend/storage/logs/tests.xml')
if p.exists():
    for test in ET.parse(p).iter('testcase'):
        for erreur in list(test):
            if erreur.tag not in ('failure', 'error'): continue
            message = test.get('classname', '')+'::'+test.get('name', '')+'\n'+''.join(erreur.itertext())
            message = message[:12000].replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
            print('::error::'+message)
