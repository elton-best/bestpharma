import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('manifeste', Path(__file__).resolve().parents[1] / 'preparer-import-corpus.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ManifesteTest(unittest.TestCase):
    def test_lot_complet_avec_provenance_sans_validation_implicite(self):
        m = module.produire()
        self.assertEqual(len(m['documents_inventories']), 91)
        self.assertEqual(len(m['fichiers']), 62)
        self.assertEqual(len(m['exclus']), 1)
        self.assertEqual(len({f['cle_source'] for f in m['fichiers']}), 62)
        self.assertTrue(all(f['code_documentaire_confirme'] is None for f in m['fichiers']))
        self.assertEqual(m['bilan']['anciens_doc_non_extraits'], 5)
        self.assertTrue(all(f['mode_import'] == 'source_a_verifier' for f in m['fichiers']))
