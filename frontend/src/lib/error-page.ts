export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>BestPharma — Connexion</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --ib-deep: #0F3B27;
        --ib-vibrant: #92FF5F;
        --ib-pale: #F7F9F7;
        --ib-line: #CFF1D2;
        --ib-ink: #0F3B27;
      }
      body {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
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
        BestPharma · Système d'Officine
      </div>
      <div class="logo">+</div>
      <h1>Connexion temporairement indisponible</h1>
      <p>La connexion se rétablit automatiquement. Vos identifiants sont conservés.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Actualiser l'application</button>
        <a class="secondary" href="/app">Tableau de bord</a>
      </div>
    </div>
    <script>
      // Relance bornée des seules navigations GET. Ne jamais rejouer une saisie.
      try {
        const key = 'begpharma.reprise-navigation';
        const prev = JSON.parse(sessionStorage.getItem(key) || '{}');
        const now = Date.now();
        const count = now - (prev.time || 0) < 60000 ? (prev.count || 0) : 0;
        if (count < 3 && navigator.onLine) {
          sessionStorage.setItem(key, JSON.stringify({ count: count + 1, time: now }));
          setTimeout(() => location.reload(), (count + 1) * 2000);
        }
      } catch (_) {}
    </script>
  </body>
</html>`;
}
