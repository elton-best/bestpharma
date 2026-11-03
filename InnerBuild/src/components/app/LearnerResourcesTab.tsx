import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Empty, Panel } from "@/components/app/AppShell";
import { MarkdownView } from "@/components/MarkdownView";
import { AI_SKILLS } from "@/data/skills";
import {
  RESOURCE_CATEGORIES,
  usePublishedResources,
  type LearningResource,
  type ResourceCategory,
} from "@/lib/learning-resources";

// Onglet « Ressources » de l'espace apprenant : affiche les ressources
// publiées depuis /admin/ressources (description, liens, image).

function ResourceCard({ r }: { r: LearningResource }) {
  const skill = r.skill_id ? AI_SKILLS.find((s) => s.id === r.skill_id) : undefined;
  const categoryLabel = RESOURCE_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-all hover:border-accent/50">
      {r.image_url && (
        <img
          src={r.image_url}
          alt=""
          loading="lazy"
          className="h-40 w-full border-b border-line object-cover"
        />
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            {categoryLabel}
          </span>
          {skill && (
            <Link
              to="/app/ressources"
              search={{ skill: skill.id }}
              className="truncate font-mono text-[10px] text-muted-foreground hover:text-accent"
              title={`Voir la skill ${skill.name}`}
            >
              {skill.name}
            </Link>
          )}
        </div>

        <h3 className="mt-2.5 text-sm font-bold text-ink">{r.title}</h3>

        {r.description && (
          <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            <MarkdownView>{r.description}</MarkdownView>
          </div>
        )}

        {r.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.tags.map((t) => (
              <span
                key={t}
                className="rounded-md border border-line bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {r.links.length > 0 && (
          <ul className="mt-3.5 space-y-1.5 border-t border-line pt-3">
            {r.links.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{l.label?.trim() || l.url}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function LearnerResourcesTab() {
  const { data: resources = [], isLoading, error } = usePublishedResources();
  const [category, setCategory] = useState<"all" | ResourceCategory>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [resources, category, query]);

  if (isLoading) {
    return (
      <Panel>
        <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des ressources…
        </p>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <Empty
          title="Ressources indisponibles"
          text="Impossible de charger les ressources pour le moment. Réessaie dans quelques instants."
        />
      </Panel>
    );
  }

  if (!resources.length) {
    return (
      <Panel>
        <Empty
          title="Aucune ressource pour l'instant"
          text="L'équipe pédagogique publiera ici des guides, outils et lectures complémentaires."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une ressource (titre, description, tag)…"
          className="w-full rounded-xl border border-line bg-card py-2.5 pl-10 pr-4 text-xs text-ink shadow-xs placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {([{ id: "all", label: "Toutes" }, ...RESOURCE_CATEGORIES] as const).map((c) => {
          const count =
            c.id === "all" ? resources.length : resources.filter((r) => r.category === c.id).length;
          if (!count && c.id !== "all") return null;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id as "all" | ResourceCategory)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                category === c.id ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {!filtered.length ? (
        <Panel>
          <Empty title="Aucun résultat" text="Aucune ressource ne correspond à cette recherche." />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ResourceCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
