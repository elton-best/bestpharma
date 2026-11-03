import { FileText, ImagePlus, LoaderCircle, Trash2, Upload, Link2 } from "lucide-react";
import { useState } from "react";
import { FilePreview } from "@/components/admin/FilePreview";
import { useContentActions } from "@/lib/content";

export function AttachmentUpload({
  type,
  value,
  onChange,
}: {
  type: "image" | "pdf";
  value: string;
  onChange: (path: string) => void;
}) {
  const act = useContentActions();
  const [busy, setBusy] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const isImage = type === "image";
  const label = isImage ? "Ajouter une image" : "Ajouter un document PDF";

  function applyUrl() {
    const clean = urlDraft.trim();
    if (!clean) return;
    onChange(clean);
    setUrlDraft("");
    setShowUrlInput(false);
  }

  return (
    <div className="space-y-3">
      {!value && !showUrlInput && (
        <div>
          <label className="group flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-line bg-muted/30 p-4 transition-colors hover:border-accent hover:bg-accent/5 focus-within:border-accent">
            <input
              type="file"
              accept={isImage ? "image/*" : "application/pdf"}
              className="sr-only"
              onChange={async (event) => {
                const selected = event.target.files?.[0];
                if (!selected) return;
                setBusy(true);
                const path = await act.upload(selected, type);
                setBusy(false);
                if (path) onChange(path);
                event.target.value = "";
              }}
            />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-card text-accent shadow-sm">
              {busy ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : isImage ? (
                <ImagePlus className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">
                {busy ? "Envoi et optimisation en cours…" : label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {isImage ? "JPG, PNG ou WebP · Glisser ou cliquer" : "Document PDF"} · 10 Mo max
              </span>
            </span>
            <Upload className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-accent" />
          </label>

          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="inline-flex items-center gap-1 text-accent hover:underline font-semibold"
            >
              <Link2 className="h-3.5 w-3.5" /> Ou coller une URL directe ({isImage ? "lien image web" : "lien PDF"})
            </button>
            {isImage && (
              <span className="text-[11px] text-muted-foreground/80">
                Mode résilient actif (R2 + WebP direct)
              </span>
            )}
          </div>
        </div>
      )}

      {showUrlInput && !value && (
        <div className="rounded-xl border border-line bg-card p-3.5 space-y-2.5">
          <label className="block text-xs font-bold text-ink">
            URL directe de {isImage ? "l'image" : "du PDF"} (ex: https://...) :
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder={isImage ? "https://images.unsplash.com/... ou https://..." : "https://monsite.com/doc.pdf"}
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              className="input-base text-xs flex-1"
            />
            <button
              type="button"
              onClick={applyUrl}
              className="btn-base btn-glow text-xs px-3"
            >
              Valider
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="btn-base btn-ghost text-xs px-2"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {value && (
        <div className="space-y-2">
          <FilePreview path={value} type={type} />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-xs">
              {value.startsWith("data:") ? "Image intégrée optimisée (WebP)" : value}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="btn-base btn-ghost text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Retirer {isImage ? "l’image" : "le PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}