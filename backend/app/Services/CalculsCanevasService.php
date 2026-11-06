<?php
namespace App\Services;
/** Arithmétique locale bornée, sans exécuter les formules du classeur. */
class CalculsCanevasService
{
    public function recalculer(array $source, array $valeurs): array
    {
        foreach ($source['parties'] as $partie) {
            $cellules = [];
            foreach ($partie['blocs'] as $b) foreach ($b['lignes'] ?? [] as $ligne) foreach ($ligne as $c) $cellules[] = $c;
            $adresses = []; foreach ($cellules as $c) if (isset($c['adresse'])) $adresses[$c['adresse']] = $c;
            $cache = []; $visites = [];
            $lire = function ($c) use (&$lire, &$cache, &$visites, $adresses, $valeurs): ?float {
                if (!$c || isset($visites[$c['cle']])) return null;
                if (array_key_exists($c['cle'], $cache)) return $cache[$c['cle']];
                $visites[$c['cle']] = true; $n = null;
                if (isset($c['calcul'])) {
                    $a = $lire($adresses[$c['calcul']['gauche']] ?? null); $b = $lire($adresses[$c['calcul']['droite']] ?? null);
                    if ($a !== null && $b !== null) $n = match ($c['calcul']['operateur']) {
                        '*' => $a * $b, '-' => $a - $b, '+' => $a + $b, '/' => $b == 0 ? null : $a / $b, default => null,
                    };
                } else {
                    $texte = str_replace(',', '.', preg_replace('/\s/u', '', trim($valeurs[$c['cle']] ?? $c['texte'])));
                    if (preg_match('/^[+-]?\d+(?:\.\d+)?$/D', $texte)) $n = (float) $texte;
                }
                if ($n !== null && (!is_finite($n) || abs($n) > 1e12)) $n = null;
                unset($visites[$c['cle']]); return $cache[$c['cle']] = $n;
            };
            foreach ($cellules as $c) if (isset($c['calcul'])) {
                $n = $lire($c); $valeurs[$c['cle']] = $n === null ? '' : rtrim(rtrim(number_format($n, 6, '.', ''), '0'), '.');
            }
        }
        return $valeurs;
    }
}
