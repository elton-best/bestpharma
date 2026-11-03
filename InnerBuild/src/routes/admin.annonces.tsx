import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Copy,
  Plus,
  Radio,
  Sparkles,
  Video,
  X,
  Presentation,
  Megaphone,
  ShieldCheck,
  Users,
  Trash2,
  Mail,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { AttachmentUpload } from "@/components/admin/AttachmentUpload";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { MarkdownView } from "@/components/MarkdownView";
import { useAnnouncementActions, useAnnouncements, type Announcement } from "@/lib/announcements";
import { JitsiMeetRoom } from "@/components/JitsiMeetRoom";
import { Pill } from "./admin.cours";

export const Route = createFileRoute("/admin/annonces")({
  head: appHead(
    "Agenda, Keynotes & Annonces — Administration",
    "Créer des événements en direct, configurer les salles Jitsi Meet, inviter automatiquement les intervenants et notifier les participants."
  ),
  component: Page,
});

export type Speaker = {
  name: string;
  email: string;
  role: string;
};

type Draft = {
  kind: Announcement["kind"];
  title: string;
  body: string;
  video_url: string;
  image_path: string;
  pdf_path: string;
  event_at: string;
  pinned: boolean;
  published: boolean;
};

const empty: Draft = {
  kind: "keynote",
  title: "",
  body: "",
  video_url: "",
  image_path: "",
  pdf_path: "",
  event_at: "",
  pinned: false,
  published: true,
};

const toLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

function Form({
  initial,
  onSave,
  onCancel,
  label,
}: {
  initial: Draft;
  onSave: (d: Draft, speakers: Speaker[]) => Promise<boolean>;
  onCancel?: () => void;
  label: string;
}) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [testRoom, setTestRoom] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newSpeakerEmail, setNewSpeakerEmail] = useState("");
  const [newSpeakerRole, setNewSpeakerRole] = useState("Intervenant d'honneur");

  function generateJitsiRoom() {
    const slug = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = "LIVE-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    const roomName = `AIFAC-Live-${slug}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;

    setD((curr) => ({
      ...curr,
      kind: "keynote",
      video_url: roomUrl,
    }));

    toast.success(`Salle Live configurée (${roomName}) avec code d'accès : ${code}`);
  }

  function addSpeaker() {
    if (!newSpeakerName.trim() || !newSpeakerEmail.trim()) {
      toast.error("Veuillez renseigner au moins le nom et l'email de l'intervenant.");
      return;
    }
    setSpeakers((prev) => [
      ...prev,
      {
        name: newSpeakerName.trim(),
        email: newSpeakerEmail.trim().toLowerCase(),
        role: newSpeakerRole.trim() || "Intervenant d'honneur",
      },
    ]);
    setNewSpeakerName("");
    setNewSpeakerEmail("");
    toast.success(`Intervenant ajouté : ${newSpeakerName.trim()}`);
  }

  function removeSpeaker(idx: number) {
    setSpeakers((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      {/* Type selection */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {(["keynote", "announcement"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={d.kind === k}
              onClick={() => setD({ ...d, kind: k })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                d.kind === k
                  ? "bg-ink text-paper"
                  : "border border-line text-muted-foreground hover:bg-muted"
              }`}
            >
              {k === "keynote" ? (
                <>
                  <Presentation className="h-3.5 w-3.5 text-accent" /> Keynote / Session Live
                </>
              ) : (
                <>
                  <Megaphone className="h-3.5 w-3.5 text-accent" /> Annonce générale
                </>
              )}
            </button>
          ))}
        </div>

        {d.kind === "keynote" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateJitsiRoom()}
              className="btn-base btn-glow text-xs py-1.5 px-3 gap-1.5"
              title="Générer une salle Live Jitsi Meet officielle"
            >
              <Sparkles className="h-3.5 w-3.5" /> Générer salle Live Jitsi Meet
            </button>
          </div>
        )}
      </div>

      <label className="block text-sm font-semibold text-ink">
        Titre de l'événement ou de la publication *
        <input
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          placeholder="Ex. Keynote : Déployer et orchestrer son premier Agent IA en production"
          maxLength={160}
          className="field mt-1.5 text-sm"
        />
      </label>

      {d.kind === "keynote" && (
        <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl border border-accent/30 bg-accent/5">
          <div>
            <label className="text-xs font-bold text-ink">
              Lien de la visioconférence (Jitsi Meet officiel / YouTube Live)
            </label>
            <div className="relative mt-1">
              <input
                value={d.video_url}
                onChange={(e) => setD({ ...d, video_url: e.target.value })}
                placeholder="https://meet.jit.si/AIFAC-Live-XXXX"
                className="field text-xs pr-16 font-mono"
              />
              {d.video_url && d.video_url.includes("meet.jit.si") && (
                <button
                  type="button"
                  onClick={() => setTestRoom(d.video_url)}
                  className="absolute right-1 top-1 text-[11px] font-bold text-accent hover:underline px-2 py-1"
                >
                  Tester
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              S'ouvre directement dans le salon plein écran /live pour les participants.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-ink">
              Date & heure de démarrage du Live *
            </label>
            <input
              type="datetime-local"
              value={d.event_at}
              onChange={(e) => setD({ ...d, event_at: e.target.value })}
              className="field text-xs mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Sera automatiquement mis en avant dans l'Agenda des apprenants.
            </p>
          </div>
        </div>
      )}

      {/* Speakers section for Keynotes */}
      {d.kind === "keynote" && (
        <div className="rounded-xl border border-line bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h4 className="font-bold text-xs text-ink">
                Intervenant(s) d'honneur & Envoi automatique d'invitation par Email
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {speakers.length} intervenant(s)
            </span>
          </div>

          {speakers.length > 0 && (
            <ul className="space-y-2 border-b border-line pb-3">
              {speakers.map((s, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald" />
                    <div>
                      <span className="font-bold text-ink">{s.name}</span>{" "}
                      <span className="text-muted-foreground">({s.email})</span>
                      <p className="text-[10px] text-accent font-semibold">{s.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpeaker(idx)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                    title="Retirer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add speaker row */}
          <div className="grid gap-2 sm:grid-cols-4 items-end pt-1">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Nom complet
              </label>
              <input
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value)}
                placeholder="Ex. Thomas Dubois"
                className="field text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Email de l'intervenant
              </label>
              <input
                type="email"
                value={newSpeakerEmail}
                onChange={(e) => setNewSpeakerEmail(e.target.value)}
                placeholder="thomas@exemple.com"
                className="field text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Titre / Rôle
              </label>
              <input
                value={newSpeakerRole}
                onChange={(e) => setNewSpeakerRole(e.target.value)}
                placeholder="Lead Architect IA"
                className="field text-xs"
              />
            </div>
            <button
              type="button"
              onClick={addSpeaker}
              className="btn-base btn-ghost border border-line text-xs h-9 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Un email formel avec l'affiche de la session, le lien Jitsi, le code d'accès et les consignes de préparation leur sera envoyé automatiquement dès la publication.
          </p>
        </div>
      )}

      {/* Test room preview modal/box */}
      {testRoom && (
        <div className="p-4 rounded-2xl border border-accent/40 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-ink flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Test en direct du Call
            </span>
            <button
              type="button"
              onClick={() => setTestRoom(null)}
              className="text-xs text-muted-foreground hover:text-ink font-bold"
            >
              Fermer le test
            </button>
          </div>
          <JitsiMeetRoom
            roomName={testRoom}
            title={d.title || "Test Administrateur"}
            onClose={() => setTestRoom(null)}
            height="460px"
          />
        </div>
      )}

      <MarkdownEditor
        label="Description & Programme détaillé de la session"
        rows={10}
        value={d.body}
        onChange={(body) => setD((current) => ({ ...current, body }))}
        placeholder="Présentez les objectifs de la session, les prérequis, le code d'accès et le déroulé…"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AttachmentUpload
          type="image"
          value={d.image_path}
          onChange={(image_path) => setD((current) => ({ ...current, image_path }))}
        />
        <AttachmentUpload
          type="pdf"
          value={d.pdf_path}
          onChange={(pdf_path) => setD((current) => ({ ...current, pdf_path }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm text-ink pt-2">
        <label className="flex items-center gap-2 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={d.pinned}
            onChange={(e) => setD({ ...d, pinned: e.target.checked })}
            className="rounded text-accent"
          />
          Épingler en haut des annonces & de l'agenda
        </label>

        <label className="flex items-center gap-2 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={d.published}
            onChange={(e) => setD({ ...d, published: e.target.checked })}
            className="rounded text-accent"
          />
          Publier et envoyer une notification D1 immédiate à tous les apprenants
        </label>
      </div>

      <div className="flex gap-2 pt-2 border-t border-line">
        <button
          disabled={!d.title.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onSave(d, speakers);
            setBusy(false);
          }}
          className="btn-base btn-glow disabled:opacity-50 text-xs"
        >
          {busy ? "Publication en cours…" : label}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="btn-base btn-ghost text-xs">
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function Page() {
  const q = useAnnouncements();
  const act = useAnnouncementActions();
  const [k, setK] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "agenda" | "announcement">("agenda");
  const [testCallUrl, setTestCallUrl] = useState<string | null>(null);

  if (q.error) return <ErrorBox error={q.error as Error} onRetry={() => q.refetch()} />;
  if (q.isLoading) return <Loading />;

  const list = q.data!;
  const keynotes = list.filter((a) => a.kind === "keynote");
  const announcements = list.filter((a) => a.kind === "announcement");

  const rows =
    tab === "agenda" ? keynotes : tab === "announcement" ? announcements : list;

  const payload = (d: Draft, speakers: Speaker[]) => {
    // Si des intervenants sont renseignés, les formater proprement dans le corps du texte
    let fullBody = d.body;
    if (speakers.length > 0 && !fullBody.includes("### Intervenants")) {
      const speakersBlock = `\n\n### Intervenants d'honneur\n${speakers
        .map((s) => `- **${s.name}** — ${s.role}`)
        .join("\n")}\n`;
      fullBody = fullBody + speakersBlock;
    }

    return {
      ...d,
      title: d.title.trim(),
      body: fullBody,
      event_at:
        d.kind === "keynote" && d.event_at ? new Date(d.event_at).toISOString() : null,
      video_url: d.kind === "keynote" ? d.video_url.trim() : "",
    };
  };

  async function handleSaveWithSpeakers(d: Draft, speakers: Speaker[], id?: string) {
    const formatted = payload(d, speakers);
    const ok = await act.save(formatted, id);

    if (ok && d.kind === "keynote" && speakers.length > 0) {
      try {
        const { sendSpeakerInvitationEmailServerFn } = await import("@/lib/challenges.functions");
        const accessCodeMatch = (d.body + " " + d.title + " " + d.video_url).match(/\bLIVE-[A-Z0-9]{4,8}\b/i);
        const accessCode = accessCodeMatch ? accessCodeMatch[0] : undefined;

        // Résolution de l'URL publique de l'affiche via Cloudflare R2
        const publicR2 = "https://pub-e1b7047c4291458ba7b14cd1ab400698.r2.dev";
        const cleanKey = d.image_path ? d.image_path.replace(/^r2:\/?/, "").replace(/^\/+/, "") : "";
        const fullImageUrl = d.image_path
          ? d.image_path.startsWith("http") || d.image_path.startsWith("data:")
            ? d.image_path
            : `${publicR2}/${cleanKey}`
          : undefined;

        let invitedCount = 0;
        for (const sp of speakers) {
          if (!sp.email) continue;
          const res = await sendSpeakerInvitationEmailServerFn({
            data: {
              email: sp.email,
              name: sp.name,
              speakerRole: sp.role,
              keynoteTitle: d.title,
              eventAt: d.event_at,
              meetingUrl: d.video_url,
              accessCode,
              imageUrl: fullImageUrl,
              description: d.body,
            },
          });
          if (res.success) invitedCount++;
        }

        if (invitedCount > 0) {
          toast.success(`${invitedCount} invitation(s) d'honneur envoyée(s) par email aux intervenants !`);
        }
      } catch (err: any) {
        toast.warning(`Keynote publiée, mais erreur d'envoi aux intervenants : ${err.message || String(err)}`);
      }
    }

    return ok;
  }

  return (
    <>
      <PageHeader
        eyebrow="Communication & Lives"
        title="Agenda, Keynotes & Annonces"
        subtitle="Créez des keynotes en direct, configurez les visioconférences Jitsi Meet, invitez les intervenants par email et notifiez automatiquement tous les participants."
      />

      <Panel title="Créer un événement ou une annonce">
        <Form
          key={k}
          initial={empty}
          label="Publier, Inviter & Notifier"
          onSave={async (d, speakers) => {
            const ok = await handleSaveWithSpeakers(d, speakers);
            if (ok) setK((x) => x + 1);
            return ok;
          }}
        />
      </Panel>

      {/* Live Admin Tester Modal */}
      {testCallUrl && (
        <div className="my-6 p-4 rounded-2xl border border-accent bg-card space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h4 className="font-bold text-sm text-ink flex items-center gap-2">
              <Video className="h-4 w-4 text-accent" /> Salle Jitsi Meet (Aperçu Administrateur)
            </h4>
            <button
              onClick={() => setTestCallUrl(null)}
              className="text-xs font-bold text-rose-500 hover:underline"
            >
              Fermer la visioconférence
            </button>
          </div>
          <JitsiMeetRoom
            roomName={testCallUrl}
            title="Aperçu Call Direct"
            onClose={() => setTestCallUrl(null)}
            height="500px"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="my-4 flex flex-wrap gap-2">
        {(
          [
            ["agenda", `Agenda & Keynotes Live (${keynotes.length})`],
            ["announcement", `Annonces (${announcements.length})`],
            ["all", `Tout (${list.length})`],
          ] as const
        ).map(([x, l]) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === x ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <Panel title={tab === "agenda" ? "Sessions Live & Keynotes programmées" : "Publications"}>
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((a) => (
              <li key={a.id} className="py-4">
                {editing === a.id ? (
                  <Form
                    initial={{
                      kind: a.kind,
                      title: a.title,
                      body: a.body,
                      video_url: a.video_url,
                      image_path: a.image_path,
                      pdf_path: a.pdf_path,
                      event_at: toLocal(a.event_at),
                      pinned: a.pinned,
                      published: a.published,
                    }}
                    label="Mettre à jour"
                    onCancel={() => setEditing(null)}
                    onSave={async (d, speakers) => {
                      const ok = await handleSaveWithSpeakers(d, speakers, a.id);
                      if (ok) setEditing(null);
                      return ok;
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent">
                          {a.kind === "keynote" ? "Keynote Live" : "Annonce"}
                          {a.pinned ? " · Épinglée" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {new Date(a.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        {a.event_at && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(a.event_at).toLocaleString("fr-FR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-ink text-base">{a.title}</h3>

                      {a.video_url && (
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          Visio : <span className="text-accent">{a.video_url}</span>
                        </p>
                      )}

                      {a.body && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          <MarkdownView>{a.body}</MarkdownView>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Pill on={a.published} />

                      {a.video_url && a.video_url.includes("meet.jit.si") && (
                        <button
                          type="button"
                          onClick={() => setTestCallUrl(a.video_url)}
                          className="btn-base btn-ghost text-xs border border-line flex items-center gap-1"
                        >
                          <Video className="h-3.5 w-3.5 text-accent" /> Tester le Live
                        </button>
                      )}

                      <button
                        onClick={() => setEditing(a.id)}
                        className="btn-base btn-ghost text-xs"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => act.save({ title: a.title, published: !a.published }, a.id)}
                        className="btn-base btn-ghost text-xs"
                      >
                        {a.published ? "Dépublier" : "Publier"}
                      </button>
                      <button
                        onClick={() => act.remove(a)}
                        className="btn-base btn-ghost text-xs text-destructive"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="Aucune session pour l'instant"
            text="Programmez une première keynote ou publiez une annonce pour vos apprenants."
          />
        )}
      </Panel>
    </>
  );
}
