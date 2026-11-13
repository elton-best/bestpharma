// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path)
    return /\.(vue|tsx?|jsx?)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name) ? [path] : []
  })
}

const sources = sourceFiles(root).map(path => ({ path: relative(root, path), text: readFileSync(path, 'utf8') }))

describe('Volet 6 — L27 : faits réglementaires et secrets client', () => {
  it.each([
    ['journal de sauvegardes fictif', /100\s*%\s*Réussie/i],
    ['certificat d’étalonnage fictif', /CERT-2026-042/],
    ['score de revue de direction figé', /94[.,]2\s*%/],
    ['délai de clôture figé', /4[.,]2\s*jours/],
    ['état financier fictif', /18[ \u00a0\u202f]950[ \u00a0\u202f]000/],
    ['taux de lettrage figé', /94[.,]8\s*%/],
    ['jeton e-MECeF embarqué', /dgi_live_sec_/],
    ['code de secours MFA embarqué', /8492-1049/],
  ])('interdit la réintroduction : %s', (_label, pattern) => {
    const violations = sources.flatMap(source => source.text.split('\n').flatMap((line, index) =>
      pattern.test(line) ? [`${source.path}:${index + 1}`] : [],
    ))
    expect(violations, 'Ces valeurs ne constituent pas des preuves de conformité.').toEqual([])
  })
})
