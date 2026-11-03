export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>BEGPHARMA — Restauration de session</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --ib-deep: #023010;
        --ib-vibrant: #18AA38;
        --ib-pale: #EFF7F1;
        --ib-line: #CFE3D5;
        --ib-ink: #1F2420;
      }
      body {
        font-family: 'Manrope', system-ui, -apple-system, sans-serif;
        background-color: #f8faf8;
        color: var(--ib-ink);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        max-width: 30rem;
        width: 100%;
        text-align: center;
        background: #ffffff;
        border: 1px solid var(--ib-line);
        border-radius: 1.5rem;
        padding: 2.5rem 2rem;
        box-shadow: 0 4px 20px -2px rgba(2, 48, 16, 0.08);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--ib-pale);
        color: var(--ib-deep);
        border: 1px solid var(--ib-line);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.35rem 0.85rem;
        border-radius: 9999px;
        margin-bottom: 1.25rem;
      }
      .badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ib-vibrant);
      }
      .logo {
        width: 48px;
        height: 48px;
        background: var(--ib-deep);
        color: #ffffff;
        font-family: 'Sora', sans-serif;
        font-weight: 800;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 1rem;
        margin: 0 auto 1.25rem;
        box-shadow: 0 10px 25px -5px rgba(2, 48, 16, 0.3);
      }
      h1 {
        font-family: 'Sora', sans-serif;
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--ib-ink);
        margin: 0 0 0.5rem;
        letter-spacing: -0.02em;
      }
      p {
        color: #5C6660;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0 0 1.75rem;
      }
      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      a, button {
        padding: 0.65rem 1.25rem;
        border-radius: 0.75rem;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
      }
      .primary {
        background: var(--ib-deep);
        color: #ffffff;
        border: 1px solid var(--ib-deep);
      }
      .primary:hover {
        background: var(--ib-vibrant);
        border-color: var(--ib-vibrant);
      }
      .secondary {
        background: #ffffff;
        color: var(--ib-deep);
        border: 1px solid var(--ib-line);
      }
      .secondary:hover {
        background: var(--ib-pale);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">
        <span class="badge-dot"></span>
        BEGPHARMA · Système d'Officine
      </div>
      <div class="logo">+</div>
      <h1>Reprise de session en cours</h1>
      <p>Votre espace de travail est protégé. Vous pouvez actualiser pour rétablir la connexion ou retourner au tableau de bord.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Actualiser l'application</button>
        <a class="secondary" href="/app">Tableau de bord</a>
      </div>
    </div>
  </body>
</html>`;
}
