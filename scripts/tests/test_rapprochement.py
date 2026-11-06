import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('rapprochement', Path(__file__).resolve().parents[1] / 'rapprocher-corpus.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RapprochementTest(unittest.TestCase):
    def test_accents_et_prefixes_ne_masquent_pas_les_titres(self):
        self.assertEqual(module.proximite('Fiche de mise en application', 'FOR-Fiche de mise en application.docx'), 1)
        self.assertEqual(module.normaliser('Équipements'), 'equipements')

    def test_titres_vides_sans_correspondance(self):
        self.assertEqual(module.proximite('', 'preuve.docx'), 0)
        self.assertEqual(module.proximite('de la', 'preuve.docx'), 0)

    def test_correspondances_non_confirmees_et_codes_uniques(self):
        rapport = module.produire()
        self.assertEqual(rapport['documents_inventories'], 91)
        self.assertEqual(rapport['fichiers_disponibles'], 63)
        self.assertEqual(len({d['code'] for d in rapport['documents']}), 91)
        self.assertTrue(all(d['fichier_confirme'] is None for d in rapport['documents']))
        self.assertTrue(all(len(d['candidats']) <= 3 for d in rapport['documents']))
        self.assertEqual(rapport['avec_candidats'] + rapport['sans_candidat_par_le_nom'], 91)


if __name__ == '__main__':
    unittest.main()
