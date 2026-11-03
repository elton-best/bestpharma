import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { MarkdownView } from "@/components/MarkdownView";
import { toast } from "@/components/ui/heroui-toast";
import { AI_SKILLS } from "@/data/skills";
import {
  RESOURCE_CATEGORIES,
  uploadResourceImage,
  useAdminResources,
  useEnsureResourcesTable,
  useResourceMutations,
  type LearningResource,
  type ResourceCategory,
  type ResourceInput,
  type ResourceLink,
} from "@/lib/learning-resources";

export const Route = createFileRoute("/admin/ressources")({
  head: appHead(
    "Ressources pédagogiques",
    "Créer les ressources (description, liens, image) diffusées aux apprenants.",
  ),
  component: Page,
});

const emptyDraft: ResourceInput = {
  title: "",
  description: "",
  category: "guide",
  image_url: "",
  image_key: "",
  links: [],
  tags: [],
  skill_id: "",
  published: true,
};

function toDraft(r: LearningResource): ResourceInput {
  return {
    title: r.title,
    description: r.description,
    category: r.category,
    image_url: r.image_url,
    image_key: r.image_key,
    links: r.links,
    tags: r.tags,
    skill_id: r.skill_id,
    published: r.published,
  };
}

function ResourceForm({
  initial,
  label,
  onSave,
  onCancel,
}: {
  initial: ResourceInput;
  label: string;
  onSave: (d: ResourceInput) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<ResourceInput>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ResourceInput>(k: K, v: ResourceInput[K]) =>
    setD((c) => ({ ...c, [k]: v }));

  const setLink = (i: number, patch: Partial<ResourceLink>) =>
    setD((c) => ({
      ...c,
      links: c.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));

  async function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde : 5 Mo maximum.");
      return;
    }
    setUploading(true);
    try {
      const { url, key } = await uploadResourceImage(file);
      setD((c) => ({ ...c, image_url: url, image_key: key }));
      toast.success("Image envoyée.");
    } catch (e: any) {
      toast.error(e?.message || "Envoi de l'image impossible.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || d.tags.includes(t)) return;
    set("tags", [...d.tags, t]);
    setTagInput("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Titre de la ressource
          <input
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ex. Checklist d'accessibilité WCAG"
            maxLength={160}
            className="field mt-1.5"
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Catégorie
          <select
            value={d.category}
            onChange={(e) => set("category", e.target.value as ResourceCategory)}
            className="field mt-1.5"
          >
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MarkdownEditor
        label="Description"
        rows={8}
        value={d.description}
        onChange={(description) => setD((c) => ({ ...c, description }))}
        placeholder="Explique à quoi sert cette ressource, à qui elle s'adresse et comment l'utiliser…"
      />

      {/* Image */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-ink">Image de couverture</span>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          {d.image_url ? (
            <div className="relative shrink-0">
              <img
                src={d.image_url}
                alt=""
                className="h-28 w-44 rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => setD((c) => ({ ...c, image_url: "", image_key: "" }))}
                aria-label="Retirer l'image"
                className="absolute -right-2 -top-2 rounded-full border border-line bg-paper p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex h-28 w-44 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted-foreground">
              Aucune image
            </div>
          )}
          <div className="flex-1 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => pickImage(e.target.files?.[0])}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="btn-base btn-outline inline-flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi en cours…
                </>
              ) : (
                <>
                  <ImageIcon className="h-3.5 w-3.5" /> Choisir une image
                </>
              )}
            </button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP, 5 Mo maximum. L'image est stockée sur Cloudflare R2.
            </p>
            <input
              value={d.image_url}
              onChange={(e) => setD((c) => ({ ...c, image_url: e.target.value, image_key: "" }))}
              placeholder="… ou colle directement une URL d'image"
              className="field text-xs"
            />
          </div>
        </div>
      </div>

      {/* Liens */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-ink">Liens</span>
          </div>
          <button
            type="button"
            onClick={() => set("links", [...d.links, { label: "", url: "" }])}
            className="btn-base btn-outline inline-flex items-center gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un lien
          </button>
        </div>
        {d.links.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Aucun lien. Ajoute une documentation, un dépôt, une vidéo…
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {d.links.map((l, i) => (
              <li key={i} className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={l.label}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                  placeholder="Libellé (ex. Documentation officielle)"
                  className="field sm:w-64"
                />
                <input
                  value={l.url}
                  onChange={(e) => setLink(i, { url: e.target.value })}
                  placeholder="https://…"
                  className="field flex-1"
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "links",
                      d.links.filter((_, idx) => idx !== i),
                    )
                  }
                  aria-label="Supprimer ce lien"
                  className="btn-base btn-ghost px-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags + rattachement skill */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="text-sm font-semibold text-ink">Tags</span>
          <div className="mt-1.5 flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Entrée pour valider"
              className="field flex-1"
            />
            <button type="button" onClick={addTag} className="btn-base btn-outline text-xs">
              Ajouter
            </button>
          </div>
          {d.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    set(
                      "tags",
                      d.tags.filter((x) => x !== t),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                >
                  {t} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm font-semibold text-ink">
          Skill associée (facultatif)
          <select
            value={d.skill_id}
            onChange={(e) => set("skill_id", e.target.value)}
            className="field mt-1.5"
          >
            <option value="">— Aucune —</option>
            {AI_SKILLS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={d.published}
          onChange={(e) => set("published", e.target.checked)}
        />
        Publier auprès des apprenants
      </label>

      <div className="flex gap-2">
        <button
          disabled={!d.title.trim() || busy || uploading}
          onClick={async () => {
            setBusy(true);
            await onSave(d);
            setBusy(false);
          }}
          className="btn-base btn-glow disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : label}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="btn-base btn-ghost">
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function Page() {
  const table = useEnsureResourcesTable();
  const q = useAdminResources(table.data === true);
  const m = useResourceMutations();
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ResourceCategory>("all");

  const rows = useMemo(
    () => (q.data || []).filter((r) => filter === "all" || r.category === filter),
    [q.data, filter],
  );

  if (table.isLoading) return <Loading />;
  if (table.data === false)
    return (
      <ErrorBox
        error={
          new Error(
            "La table learning_resources n'a pas pu être créée. Vérifie les variables Cloudflare D1, ou applique db/learning_resources.sql manuellement.",
          )
        }
        onRetry={() => table.refetch()}
      />
    );
  if (q.error) return <ErrorBox error={q.error as Error} onRetry={() => q.refetch()} />;
  if (q.isLoading) return <Loading />;

  const list = q.data || [];

  async function save(d: ResourceInput, id?: string) {
    try {
      if (id) await m.update.mutateAsync({ ...d, id });
      else await m.insert.mutateAsync(d);
      toast.success(id ? "Ressource mise à jour." : "Ressource créée.");
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Enregistrement impossible.");
      return false;
    }
  }

  async function swap(index: number, dir: -1 | 1) {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    await m.move.mutateAsync({ id: a.id, position: b.position });
    await m.move.mutateAsync({ id: b.id, position: a.position });
  }

  return (
    <>
      <PageHeader
        eyebrow="Contenus apprenants"
        title="Ressources pédagogiques"
        subtitle="Crée les ressources affichées dans l'onglet « Ressources » de l'espace apprenant : description, liens utiles et image de couverture."
      />

      <Panel title="Nouvelle ressource">
        <ResourceForm
          key={formKey}
          initial={emptyDraft}
          label="Créer la ressource"
          onSave={async (d) => {
            const ok = await save(d);
            if (ok) setFormKey((x) => x + 1);
            return ok;
          }}
        />
      </Panel>

      <div className="my-4 flex flex-wrap gap-2">
        {([{ id: "all", label: "Toutes" }, ...RESOURCE_CATEGORIES] as const).map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id as "all" | ResourceCategory)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filter === c.id ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.label} (
            {c.id === "all" ? list.length : list.filter((r) => r.category === c.id).length})
          </button>
        ))}
      </div>

      <Panel>
        {!rows.length ? (
          <Empty
            title="Aucune ressource"
            text="Utilise le formulaire ci-dessus pour publier la première ressource de l'espace apprenant."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const index = list.findIndex((x) => x.id === r.id);
              return (
                <li key={r.id} className="py-4">
                  {editing === r.id ? (
                    <ResourceForm
                      initial={toDraft(r)}
                      label="Enregistrer"
                      onCancel={() => setEditing(null)}
                      onSave={async (d) => {
                        const ok = await save(d, r.id);
                        if (ok) setEditing(null);
                        return ok;
                      }}
                    />
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      {r.image_url && (
                        <img
                          src={r.image_url}
                          alt=""
                          className="h-20 w-32 shrink-0 rounded-lg border border-line object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                          {RESOURCE_CATEGORIES.find((c) => c.id === r.category)?.label ??
                            r.category}
                          {r.published ? "" : " · Brouillon"}
                          {r.skill_id
                            ? ` · ${AI_SKILLS.find((s) => s.id === r.skill_id)?.name ?? r.skill_id}`
                            : ""}
                        </p>
                        <p className="mt-1 font-semibold text-ink">{r.title}</p>
                        {r.description && (
                          <div className="mt-1 line-clamp-3 text-sm">
                            <MarkdownView>{r.description}</MarkdownView>
                          </div>
                        )}
                        {r.links.length > 0 && (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            {r.links.length} lien{r.links.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          disabled={index <= 0}
                          onClick={() => swap(index, -1)}
                          aria-label="Monter"
                          className="btn-base btn-ghost px-2 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          disabled={index < 0 || index >= list.length - 1}
                          onClick={() => swap(index, 1)}
                          aria-label="Descendre"
                          className="btn-base btn-ghost px-2 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(r.id)}
                          className="btn-base btn-outline text-xs"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Supprimer « ${r.title} » ?`)) return;
                            try {
                              await m.remove.mutateAsync(r.id);
                              toast.success("Ressource supprimée.");
                            } catch (e: any) {
                              toast.error(e?.message || "Suppression impossible.");
                            }
                          }}
                          aria-label="Supprimer"
                          className="btn-base btn-ghost px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
