import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  X,
  Copy,
  ExternalLink,
  Video,
  ShieldCheck,
  Radio,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getD1SessionUser } from "@/lib/d1-session";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface JitsiMeetRoomProps {
  roomName: string;
  title: string;
  accessCode?: string;
  onClose?: () => void;
  domain?: string;
  className?: string;
  height?: string | number;
}

/**
 * Composant officiel d'intégration Jitsi Meet externe pour AI Factory.
 * Conforme à la documentation officielle :
 * https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-web-jitsi-meet
 */
export function JitsiMeetRoom({
  roomName,
  title,
  accessCode,
  onClose,
  domain = "meet.jit.si",
  className = "",
  height = "640px",
}: JitsiMeetRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extraire le domaine et le nom de la room automatiquement depuis l'URL fournie
  let resolvedDomain = domain;
  let rawRoom = roomName;

  if (roomName.includes("framatalk.org/")) {
    resolvedDomain = "framatalk.org";
    rawRoom = roomName.split("framatalk.org/")[1] || "";
  } else if (roomName.includes("meet.jit.si/")) {
    resolvedDomain = "meet.jit.si";
    rawRoom = roomName.split("meet.jit.si/")[1] || "";
  } else if (/^https?:\/\//i.test(roomName)) {
    try {
      const parsedUrl = new URL(roomName);
      resolvedDomain = parsedUrl.host;
      rawRoom = parsedUrl.pathname.replace(/^\//, "");
    } catch {}
  }

  const cleanRoomName =
    (rawRoom.split(/[?#]/)[0] || "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .trim() || `AIFAC_Live_${Date.now()}`;

  const fullMeetingUrl = `https://${resolvedDomain}/${cleanRoomName}`;

  useEffect(() => {
    let isMounted = true;

    // 1. Charger dynamiquement le script Jitsi External API si pas encore présent
    function loadJitsiScript(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const scriptId = `jitsi-external-api-${resolvedDomain.replace(/[^a-z0-9]/gi, "-")}`;
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve());
          existingScript.addEventListener("error", () =>
            reject(new Error("Impossible de charger le script de visioconférence"))
          );
          return;
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://${resolvedDomain}/external_api.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(
            new Error(`Échec du chargement du serveur ${resolvedDomain}. Vérifiez votre connexion.`)
          );
        document.body.appendChild(script);
      });
    }

    // 2. Initialiser le conteneur Jitsi
    loadJitsiScript()
      .then(() => {
        if (!isMounted || !containerRef.current) return;

        // Récupérer les informations apprenant / admin de session
        const session = getD1SessionUser();
        const displayName =
          session?.fullName ||
          session?.full_name ||
          (session?.email ? session.email.split("@")[0] : "Participant AIFAC");
        const email = session?.email || "participant@aifac.local";

        // Nettoyer toute instance précédente dans le conteneur
        containerRef.current.innerHTML = "";

        const options = {
          roomName: cleanRoomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName,
            email,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            skipPrejoin: true,
            disableDeepLinking: true,
            enableWelcomePage: false,
            requireDisplayName: false,
            enableClosePage: false,
            p2p: { enabled: true },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_REMOTE_DISPLAY_NAME: "Apprenant AIFAC",
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "profile",
              "chat",
              "recording",
              "livestreaming",
              "etherpad",
              "sharedvideo",
              "settings",
              "raisehand",
              "videoquality",
              "filmstrip",
              "tileview",
              "select-background",
              "mute-everyone",
            ],
          },
        };

        const api = new window.JitsiMeetExternalAPI(resolvedDomain, options);
        jitsiApiRef.current = api;

        api.addEventListener("videoConferenceJoined", () => {
          if (isMounted) setLoading(false);
        });

        api.addEventListener("videoConferenceLeft", () => {
          if (onClose) onClose();
        });

        api.addEventListener("readyToClose", () => {
          if (onClose) onClose();
        });

        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Erreur de connexion Jitsi Meet");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
        jitsiApiRef.current = null;
      }
    };
  }, [cleanRoomName, resolvedDomain]);

  function copyCode() {
    if (!accessCode) return;
    navigator.clipboard.writeText(accessCode);
    toast.success(`Code ${accessCode} copié !`);
  }

  function copyUrl() {
    navigator.clipboard.writeText(fullMeetingUrl);
    toast.success("Lien de la salle copié !");
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-accent/40 bg-card overflow-hidden shadow-2xl transition-all ${
        isFullScreen ? "fixed inset-0 z-50 rounded-none border-none" : ""
      } ${className}`}
      style={{ height: isFullScreen ? "100vh" : height }}
    >
      {/* Top Bar Call Header */}
      <div className="flex items-center justify-between border-b border-line bg-card/95 px-4 py-3 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 animate-pulse">
            <Radio className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500">
                Live Direct
              </span>
              <h3 className="truncate text-sm font-bold text-ink">{title}</h3>
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              Salle : <span className="text-accent">{cleanRoomName}</span>
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 shrink-0">
          {accessCode && (
            <button
              type="button"
              onClick={copyCode}
              title="Copier le code d'accès"
              className="btn-base btn-ghost text-xs h-8 px-2.5 gap-1.5 font-mono border border-line"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>{accessCode}</span>
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          )}

          <button
            type="button"
            onClick={copyUrl}
            title="Copier le lien direct de la salle"
            className="btn-base btn-ghost text-xs h-8 px-2.5 gap-1.5 border border-line hidden sm:inline-flex"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Lien</span>
          </button>

          <a
            href={fullMeetingUrl}
            target="_blank"
            rel="noreferrer"
            title="Ouvrir dans un nouvel onglet"
            className="btn-base btn-ghost text-xs h-8 px-2.5 gap-1.5 border border-line hidden md:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? "Réduire l'écran" : "Plein écran"}
            className="btn-base btn-ghost text-xs h-8 px-2 border border-line"
          >
            {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Quitter le live"
              className="btn-base text-xs h-8 px-2.5 bg-rose-500/15 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl font-bold transition-all"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Jitsi Container */}
      <div className="relative flex-1 bg-black">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-center p-6 space-y-3 z-10">
            <div className="h-12 w-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">Connexion à la salle Live…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Initialisation audio et vidéo en cours via le réseau direct.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-center p-6 space-y-3 z-10">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <Video className="h-6 w-6" />
            </div>
            <p className="font-bold text-ink text-sm">{error}</p>
            <a
              href={fullMeetingUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-base btn-glow text-xs"
            >
              Ouvrir directement dans le navigateur
            </a>
          </div>
        )}

        {/* Embedded IFrame mount point */}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
