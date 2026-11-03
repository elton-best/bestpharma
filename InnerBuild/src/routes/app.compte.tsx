import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { appHead, PageHeader, Panel } from "@/components/app/AppShell";
import { d1UpdateServerFn } from "@/lib/d1-data.functions";
import { requestPasswordResetServerFn } from "@/lib/d1-auth.functions";
import { R2_PUBLIC_BASE_URL } from "@/lib/content";
import { uploadToR2ServerFn } from "@/lib/storage.functions";
import { initials, useProfile } from "@/lib/learner";

export const Route = createFileRoute("/app/compte")({
  head: appHead("Mon compte", "Gère ton profil d’apprenant AIFAC."),
  component: Page,
});

function Page() {
  const { data: p } = useProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (p) setName(p.full_name);
  }, [p]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !p) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `avatars/${p.id}/avatar-${Date.now()}.${ext}`;

      let avatarUrl = "";
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] ?? 0);
        const up = await uploadToR2ServerFn({ data: { key: filePath, base64: btoa(binary), contentType: file.type } });
        if (up.success) {
          avatarUrl = up.url || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${filePath}` : "");
        }
      } catch (_) {}

      if (!avatarUrl) {
        const { optimizeImageToDataUrl } = await import("@/lib/content");
        avatarUrl = await optimizeImageToDataUrl(file, 300, 0.85);
      }

      if (!avatarUrl) throw new Error("Impossible de traiter la photo.");

      const upd = await d1UpdateServerFn({ data: { table: "profiles", id: p.id, patch: { avatar_url: avatarUrl } } });
      if (!upd.success) throw new Error(upd.error || "Profil D1");

      toast.success("Photo de profil mise à jour !");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement de la photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!p) return;
    setUploading(true);
    try {
      const res = await d1UpdateServerFn({ data: { table: "profiles", id: p.id, patch: { avatar_url: "" } } });

      if (!res.success) throw new Error(res.error || "D1");
      toast.success("Photo de profil retirée.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Impossible de retirer la photo.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 80) {
      toast.error("Nom invalide");
      return;
    }
    const res = await d1UpdateServerFn({ data: { table: "profiles", id: p!.id, patch: { full_name: n } } });
    if (!res.success) {
      toast.error("Enregistrement impossible");
      return;
    }
    toast.success("Profil mis à jour");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function reset() {
    if (!p?.email) {
      toast.error("Envoi impossible");
      return;
    }
    try {
      await requestPasswordResetServerFn({
        data: { email: p.email, baseUrl: window.location.origin },
      });
      toast.success("Lien envoyé par email");
    } catch {
      toast.error("Envoi impossible");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Compte" title="Mon compte" />
      <div className="grid max-w-3xl gap-6">
        <Panel title="Photo de profil">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              {p?.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.full_name || "Avatar"}
                  className="h-24 w-24 rounded-2xl object-cover border-2 border-line shadow-sm"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-ink font-display text-2xl font-bold text-paper shadow-sm">
                  {initials(p?.full_name ?? "", p?.email ?? "")}
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <h3 className="font-semibold text-ink text-sm">Votre avatar d'apprenant</h3>
              <p className="text-xs text-muted-foreground">
                Formats acceptés : JPG, PNG ou WebP. Taille maximale : 5 Mo.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-base btn-glow gap-1.5 py-1.5 text-xs font-semibold"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {p?.avatar_url ? "Changer la photo" : "Ajouter une photo"}
                </button>

                {p?.avatar_url && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={removeAvatar}
                    className="btn-base btn-ghost gap-1.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Profil">
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm font-semibold text-ink">
              Nom
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Email
              <input
                disabled
                value={p?.email ?? ""}
                className="mt-1 w-full rounded-lg border border-line bg-muted px-3 py-2 text-sm text-muted-foreground"
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Accès : <b className="text-ink">{p?.active ? "Formation complète (Pro)" : "Découverte"}</b>
            </p>
            <button type="submit" className="btn-base btn-glow w-full sm:w-auto justify-center">
              Enregistrer les modifications
            </button>
          </form>
        </Panel>

        <Panel title="Sécurité">
          <p className="text-sm text-muted-foreground">
            Reçois un lien par email pour choisir un nouveau mot de passe.
          </p>
          <button type="button" onClick={reset} className="btn-base btn-ghost mt-4 w-full sm:w-auto justify-center">
            Changer mon mot de passe
          </button>
        </Panel>
      </div>
    </>
  );
}
