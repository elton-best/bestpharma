import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


spec = importlib.util.spec_from_file_location(
    "reference_corpus", Path(__file__).resolve().parents[1] / "verify-reference-corpus.py"
)
corpus = importlib.util.module_from_spec(spec)
spec.loader.exec_module(corpus)


class ReferenceCorpusTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.sources = self.root / "sources"
        self.sources.mkdir()
        (self.sources / "sample.txt").write_bytes(b"reference only")
        self.catalogue = self.root / "catalogue.json"
        self.entry = {
            "id": "test-reference", "titre": "Source de test", "rubrique": "Test",
            "fichier": "sample.txt", "sha256": hashlib.sha256(b"reference only").hexdigest(),
            "parties": [{"texte": "Source de test"}],
        }

    def write(self, entries):
        self.catalogue.write_text(json.dumps({
            "schema": "begpharma.canevas.v1", "canevas": entries, "non_integres": [],
        }), encoding="utf-8")

    def test_counts_are_derived_and_integrity_never_means_approval(self):
        self.write([self.entry])
        result = corpus.verify(self.catalogue, self.sources)
        self.assertEqual(result["documents"], 1)
        self.assertEqual(result["verified"], 1)
        self.assertEqual(result["errors"], [])
        self.assertFalse(result["approved"])

    def test_altered_source_is_rejected(self):
        self.write([self.entry])
        (self.sources / "sample.txt").write_text("changed")
        self.assertIn("SHA-256 différente", corpus.verify(self.catalogue, self.sources)["errors"][0])

    def test_duplicate_is_rejected(self):
        self.write([self.entry, self.entry])
        self.assertIn("dupliqué", corpus.verify(self.catalogue, self.sources)["errors"][0])

    def test_traversal_and_symlink_escape_are_rejected(self):
        outside = self.root / "outside.txt"
        outside.write_text("outside")
        (self.sources / "link.txt").symlink_to(outside)
        for path in ["../outside.txt", str(outside), "link.txt", "folder\\outside.txt"]:
            with self.subTest(path=path):
                self.write([dict(self.entry, fichier=path)])
                self.assertTrue(corpus.verify(self.catalogue, self.sources)["errors"])

    def test_invalid_schema_fails_closed(self):
        self.catalogue.write_text("[]")
        with self.assertRaises(ValueError):
            corpus.verify(self.catalogue, self.sources)


if __name__ == "__main__":
    unittest.main()
