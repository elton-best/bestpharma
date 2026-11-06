// Généré depuis frontend/src/lib/calculs-canevas.ts ; aucune évaluation de code des classeurs.
/** Calculs arithmétiques locaux uniquement : aucun code, macro ou numérotation officielle. */
export function recalculerCanevas(source, valeurs) {
    const resultat = { ...valeurs };
    for (const partie of source.parties) {
        const cellules = partie.blocs.flatMap(b => b.lignes?.flat() ?? []);
        const adresses = new Map(cellules.filter(c => c.adresse).map(c => [c.adresse, c]));
        const cache = new Map();
        const visites = new Set();
        function lire(c) {
            if (!c || visites.has(c.cle))
                return null;
            if (cache.has(c.cle))
                return cache.get(c.cle);
            visites.add(c.cle);
            let n = null;
            if (c.calcul) {
                const a = lire(adresses.get(c.calcul.gauche)), b = lire(adresses.get(c.calcul.droite));
                if (a !== null && b !== null)
                    switch (c.calcul.operateur) {
                        case "*":
                            n = a * b;
                            break;
                        case "-":
                            n = a - b;
                            break;
                        case "+":
                            n = a + b;
                            break;
                        case "/":
                            n = b === 0 ? null : a / b;
                            break;
                    }
            }
            else {
                const texte = (valeurs[c.cle] ?? c.texte).trim().replace(/\s/g, "").replace(",", ".");
                if (/^[+-]?\d+(?:\.\d+)?$/.test(texte))
                    n = Number(texte);
            }
            if (n !== null && (!Number.isFinite(n) || Math.abs(n) > 1e12))
                n = null;
            visites.delete(c.cle);
            cache.set(c.cle, n);
            return n;
        }
        for (const c of cellules.filter(c => c.calcul)) {
            const n = lire(c);
            resultat[c.cle] = n === null ? "" : n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
        }
    }
    return resultat;
}
