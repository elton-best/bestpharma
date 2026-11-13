#!/usr/bin/env python3
"""Verify the archived reference corpus without executing or approving its content."""

import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import sys


def verify(catalogue: Path, source_root: Path) -> dict:
    root = source_root.resolve(strict=True)
    content = json.loads(catalogue.read_text(encoding="utf-8"))
    if not isinstance(content, dict) or content.get("schema") != "begpharma.canevas.v1":
        raise ValueError("Schéma de catalogue inconnu.")
    if not isinstance(content.get("non_integres"), list):
        raise ValueError("Liste des sources non intégrées invalide.")
    entries = content.get("canevas")
    if not isinstance(entries, list) or not entries:
        raise ValueError("Le catalogue doit contenir des documents.")
    ids, paths, rubriques, errors = set(), set(), collections.Counter(), []
    for index, entry in enumerate(entries):
        label = f"document {index + 1}"
        try:
            if not isinstance(entry, dict):
                raise ValueError("entrée invalide")
            for key in ("id", "titre", "rubrique", "fichier", "sha256"):
                if not isinstance(entry.get(key), str) or not entry[key].strip():
                    raise ValueError(f"champ {key} manquant")
            label = entry["id"]
            if label in ids:
                raise ValueError("identifiant dupliqué")
            ids.add(label)
            relative = Path(entry["fichier"])
            if relative.is_absolute() or ".." in relative.parts or "\\" in entry["fichier"]:
                raise ValueError("chemin non autorisé")
            source = (root / relative).resolve(strict=True)
            if not source.is_relative_to(root) or not source.is_file():
                raise ValueError("source hors corpus ou non régulière")
            if source in paths:
                raise ValueError("source dupliquée")
            paths.add(source)
            if not re.fullmatch(r"[a-f0-9]{64}", entry["sha256"]):
                raise ValueError("empreinte invalide")
            with source.open("rb") as stream:
                actual = hashlib.file_digest(stream, "sha256").hexdigest()
            if actual != entry["sha256"]:
                raise ValueError("empreinte SHA-256 différente")
            if not isinstance(entry.get("parties"), list) or not entry["parties"]:
                raise ValueError("contenu structuré absent")
            rubriques[entry["rubrique"]] += 1
        except (ValueError, OSError) as error:
            errors.append(f"{label}: {error}")
    return {
        "documents": len(entries),
        "verified": sum(rubriques.values()),
        "rubriques": dict(rubriques),
        "non_integres": len(content.get("non_integres", [])),
        "errors": errors,
        "approved": False,
        "notice": "Intégrité des fichiers seulement : aucune approbation métier ou conformité BPD attestée.",
    }


def main() -> int:
    project = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalogue", type=Path, default=project / "references/canevas/catalogue.json")
    parser.add_argument("--sources", type=Path, default=project / "0000. DIGIT ABMEB")
    args = parser.parse_args()
    try:
        result = verify(args.catalogue, args.sources)
    except (OSError, ValueError, TypeError) as error:
        print(json.dumps({"errors": [str(error)], "approved": False}, ensure_ascii=False))
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return int(bool(result["errors"]))


if __name__ == "__main__":
    sys.exit(main())
