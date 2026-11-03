import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Megaphone,
  Pin,
  Presentation,
  Radio,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { MarkdownView } from "@/components/MarkdownView";
import { embedUrl, useAnnouncements, type Announcement } from "@/lib/announcements";
import { useFileUrl } from "@/lib/content";
import { JitsiMeetRoom } from "@/components/JitsiMeetRoom";

export const Route = createFileRoute("/app/annonces")({
  head: appHead(
    "Keynotes, Agenda & Annonces — AI Factory",
    "Suivez les keynotes en direct, rejoignez les sessions lives Jitsi Meet et consultez les annonces officielles."
  ),
  component: Page,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

function isJitsiUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("meet.jit.si") || url.includes("framatalk.org") || url.startsWith("jitsi:") || url.includes("/meet/");
}

function extractJitsiRoom(url: string): string {
  if (url.includes("meet.jit.si/")) {
    return url.split("meet.jit.si/")[1]?.split(/[?#]/)[0] || "";
  }
  if (url.includes("framatalk.org/")) {
    return url.split("framatalk.org/")[1]?.split(/[?#]/)[0] || "";
  }
  return url.replace(/^jitsi:/i, "").trim();
}

function extractAccessCode(text: string): string | undefined {
  const match = text.match(/\b(LIVE-[A-Z0-9]{4,8}|CODE:?\s*([A-Z0-9-]{4,10}))\b/i);
  return match ? (match[2] || match[1] || "").toUpperCase() : undefined;
}

function KeynoteLiveCard({
  a,
  isActiveCall,
  onJoinCall,
  onLeaveCall,
}: {
  a: Announcement;
  isActiveCall: boolean;
  onJoinCall: () => void;
  onLeaveCall: () => void;
}) {
  const isJitsi = isJitsiUrl(a.video_url);
  const roomName = isJitsi ? extractJitsiRoom(a.video_url) : "";
  const code = extractAccessCode(a.body + " " + a.title + " " + a.video_url);
  const embed = !isJitsi ? embedUrl(a.video_url) : "";

  const eventDate = a.event_at ? new Date(a.event_at) : null;
  const now = new Date();
  const diffHours = eventDate ? (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
  const isNowLive = diffHours !== null && diffHours >= -2 && diffHours <= 1.5;
  const isUpcoming = diffHours !== null && diffHours > 1.5;

  const image = useFileUrl(a.image_path || undefined);
  const pdf = useFileUrl(a.pdf_path || undefined);

  return (
    <Panel className="border-accent/25 hover:border-accent/40 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          {isNowLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-rose-500 animate-pulse">
              <Radio className="h-3.5 w-3.5" /> En Direct
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-0.5 text-xs font-bold text-accent">
              <Clock className="h-3.5 w-3.5" /> À Venir
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">
              <Presentation className="h-3.5 w-3.5" /> Keynote
            </span>
          )}

          {a.pinned && (
            <span className="inline-flex items-center gap-1 rounded bg-amber/15 px-2 py-0.5 text-[11px] font-bold text-ink">
              <Pin className="h-3 w-3" /> Épinglée
            </span>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          Publié le {new Date(a.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <h2 className="font-display text-lg sm:text-xl font-bold text-ink">{a.title}</h2>

        {a.event_at && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
              <CalendarDays className="h-3.5 w-3.5" /> {fmt(a.event_at)}
            </span>

            {code && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success(`Code ${code} copié !`);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-mono font-bold text-ink hover:bg-muted"
                title="Copier le code d'accès"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
                <span>Code : {code}</span>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {image.data && (
        <img
          src={image.data}
          alt=""
          className="mt-4 max-h-[26rem] w-full rounded-xl bg-muted object-contain border border-line"
        />
      )}

      {a.body && (
        <div className="mt-4 text-sm leading-relaxed text-ink/90">
          <MarkdownView>{a.body}</MarkdownView>
        </div>
      )}

      {/* Embedded Jitsi Live Room when user joined */}
      {isActiveCall && isJitsi && roomName && (
        <div className="mt-5">
          <JitsiMeetRoom
            roomName={roomName}
            title={a.title}
            accessCode={code}
            onClose={onLeaveCall}
            height="580px"
          />
        </div>
      )}

      {/* Non-Jitsi standard embed */}
      {!isJitsi && embed && (
        <iframe
          src={embed}
          title={a.title}
          className="mt-4 aspect-video w-full rounded-xl border border-line"
          allowFullScreen
        />
      )}

      {/* Call to actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t border-line">
        {isJitsi && (
          <>
            <Link
              to="/live"
              search={{
                room: roomName,
                title: a.title,
                code: code || "",
              }}
              className="btn-base btn-glow text-xs flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              <span>{isNowLive ? "Rejoindre le Live (Plein Écran)" : "Accéder au Salon Live"}</span>
            </Link>

            {!isActiveCall ? (
              <button
                type="button"
                onClick={onJoinCall}
                className="btn-base btn-ghost text-xs border border-line"
              >
                Aperçu miniature dans la page
              </button>
            ) : (
              <button
                type="button"
                onClick={onLeaveCall}
                className="btn-base btn-ghost text-xs border border-line"
              >
                Réduire l'aperçu
              </button>
            )}

            <a
              href={a.video_url?.startsWith("http") ? a.video_url : `https://meet.jit.si/${roomName}`}
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-ghost text-xs border border-line inline-flex items-center gap-1.5"
            >
              <span>Ouvrir dans un onglet séparé</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}

        {!isJitsi && a.video_url && (
          <a
            href={a.video_url}
            target="_blank"
            rel="noreferrer"
            className="btn-base btn-glow text-xs"
          >
            {isUpcoming ? "Accéder à la keynote" : "Voir l'enregistrement"}
          </a>
        )}

        {pdf.data && (
          <a
            href={pdf.data}
            target="_blank"
            rel="noreferrer"
            className="btn-base btn-ghost text-xs border border-line inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Document joint
          </a>
        )}
      </div>
    </Panel>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  const image = useFileUrl(a.image_path || undefined);
  const pdf = useFileUrl(a.pdf_path || undefined);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
            <Megaphone className="h-3.5 w-3.5" /> Annonce
          </span>
          {a.pinned && (
            <span className="inline-flex items-center gap-1 rounded bg-amber/15 px-2 py-0.5 text-[11px] font-bold text-ink">
              <Pin className="h-3 w-3" /> Épinglée
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(a.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>

      <h2 className="mt-3 font-display text-lg font-bold text-ink">{a.title}</h2>

      {image.data && (
        <img
          src={image.data}
          alt=""
          className="mt-4 max-h-[26rem] w-full rounded-xl bg-muted object-contain border border-line"
        />
      )}

      {a.body && (
        <div className="mt-4 text-sm leading-relaxed text-ink/90">
          <MarkdownView>{a.body}</MarkdownView>
        </div>
      )}

      {pdf.data && (
        <a
          href={pdf.data}
          target="_blank"
          rel="noreferrer"
          className="btn-base btn-ghost mt-4 text-xs border border-line inline-flex items-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" /> Télécharger la pièce jointe
        </a>
      )}
    </Panel>
  );
}

function Page() {
  const { data = [], isLoading, error } = useAnnouncements();
  const [tab, setTab] = useState<"all" | "agenda" | "announcement">("all");
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const keynotes = data.filter((a) => a.kind === "keynote");
  const announcements = data.filter((a) => a.kind === "announcement");

  // Prochains événements triés chronologiquement
  const upcomingEvents = keynotes.filter(
    (a) => a.event_at && new Date(a.event_at).getTime() >= Date.now() - 3600000 * 2
  );

  const displayedRows =
    tab === "agenda" ? keynotes : tab === "announcement" ? announcements : data;

  return (
    <>
      <PageHeader
        eyebrow="Communauté & Direct"
        title="Keynotes, Agenda & Annonces"
        subtitle="Suivez les keynotes en direct via Jitsi Meet, échangez avec les formateurs et retrouvez toutes les communications de l'AI Factory."
      />

      {/* Quick Agenda Live Banner */}
      {upcomingEvents.length > 0 && (
        <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                  Agenda des sessions en direct
                </span>
                <h3 className="font-bold text-ink text-base">
                  Prochaine Keynote : {upcomingEvents[0]?.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prévue le {fmt(upcomingEvents[0]?.event_at || "")} · Visioconférence intégrée
                </p>
              </div>
            </div>

            {upcomingEvents[0] && (
              <Link
                to="/live"
                search={{
                  room: extractJitsiRoom(upcomingEvents[0].video_url),
                  title: upcomingEvents[0].title,
                  code: extractAccessCode(upcomingEvents[0].body + " " + upcomingEvents[0].title + " " + upcomingEvents[0].video_url) || "",
                }}
                className="btn-base btn-glow text-xs shrink-0 flex items-center gap-1.5"
              >
                <Video className="h-3.5 w-3.5" /> Rejoindre la session en direct
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["all", "Toutes les publications"],
            ["agenda", `Agenda & Keynotes Live (${keynotes.length})`],
            ["announcement", `Annonces (${announcements.length})`],
          ] as const
        ).map(([x, l]) => (
          <button
            key={x}
            role="tab"
            aria-selected={tab === x}
            onClick={() => setTab(x)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === x ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {error ? (
        <Empty title="Chargement impossible" text="Réessaie dans un instant." />
      ) : isLoading ? (
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      ) : displayedRows.length ? (
        <div className="space-y-5">
          {displayedRows.map((a) =>
            a.kind === "keynote" ? (
              <KeynoteLiveCard
                key={a.id}
                a={a}
                isActiveCall={activeCallId === a.id}
                onJoinCall={() => setActiveCallId(a.id)}
                onLeaveCall={() => setActiveCallId(null)}
              />
            ) : (
              <AnnouncementCard key={a.id} a={a} />
            )
          )}
        </div>
      ) : (
        <Empty
          title="Aucun contenu dans cette section"
          text="Les keynotes et annonces apparaîtront dès leur publication par l'équipe."
        />
      )}
    </>
  );
}
