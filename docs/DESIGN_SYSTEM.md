# Design System BEGPHARMA

## Polices
| Token | Famille | Poids | Usage |
|---|---|---|---|
| `--font-sans` | Manrope | 400, 500, 600, 700 | Corps, interface, boutons, FAQ |
| `--font-display` | Bricolage Grotesque | 500, 700, 800 (opsz 12→96) | Titres h1/h2/h3, logo, chiffres |
| `--font-serif` | Instrument Serif | italique uniquement | Accents éditoriaux via `.accent-serif` |

Google Fonts :
`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Serif:ital@1&family=Manrope:wght@400;500;600;700&display=swap`

## Tailwind
`font-sans` → Manrope, `font-display` → Bricolage Grotesque, `font-serif` → Instrument Serif. Couleur primaire teal pharma (`pharma-600 #0D9488`).

## Exemples
- Titre : `<h1 class="font-display text-4xl font-extrabold">…</h1>`
- Accent : `<span class="accent-serif">un skill qui reste.</span>`
