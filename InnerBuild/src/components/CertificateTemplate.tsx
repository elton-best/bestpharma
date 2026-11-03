import { LogoMark } from "@/components/Logo";
import { Download, CheckCircle2, Send, QrCode } from "lucide-react";

export interface CertificateData {
  id: string;
  recipientName: string;
  projectTitle?: string;
  customText?: string;
  dateStr: string;
  type?: "formation" | "hackathon";
  verificationUrl?: string;
  signatory1Name?: string;
  signatory1Role?: string;
  signatory2Name?: string;
  signatory2Role?: string;
}

interface CertificateTemplateProps {
  cert: CertificateData;
  onSendToDashboard?: (cert: CertificateData) => void;
  isSent?: boolean;
  canSend?: boolean;
}

// Format name so only the first letter of each word is capitalized
export function toTitleCase(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * 4Talents Vector Logo Badge
 */
function FourTalentsBadge({ size = 52 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-[#0f172a] shadow-md border border-white/20 shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 40 40" fill="none">
        {/* White checkmark left branch */}
        <path
          d="M10 21L18 29L30 15"
          stroke="#ffffff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Orange tip dot */}
        <circle cx="30" cy="15" r="4.5" fill="#ea580c" />
        {/* Orange baseline */}
        <rect x="12" y="32" width="16" height="4" rx="2" fill="#ea580c" />
      </svg>
    </div>
  );
}

/**
 * The InnerBuild Vector Logo Badge
 */
function InnerBuildBadge({ size = 52 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-white shadow-md border border-white/40 shrink-0"
      style={{ width: size, height: size }}
    >
      <LogoMark size={size * 0.7} />
    </div>
  );
}

export function CertificateTemplate({
  cert,
  onSendToDashboard,
  isSent = false,
  canSend = false,
}: CertificateTemplateProps) {
  function handleDownload() {
    window.print();
  }

  const isHackathon =
    cert.type === "hackathon" ||
    cert.projectTitle?.toLowerCase().includes("hackathon");

  const formattedName = toTitleCase(cert.recipientName);

  // Signataires officiels retenus
  const sig1Name = cert.signatory1Name || "Sonagnon Obed AGBOHOUN";
  const sig1Role = cert.signatory1Role || "Software engineer · Promoteur de 4Talents";

  const sig2Name = cert.signatory2Name || "N. E. Ronald Bill HOUNNOU";
  const sig2Role =
    cert.signatory2Role || "Développeur fullstack · Fondateur de The InnerBuild";

  // Palette thématique
  const theme = isHackathon
    ? {
        primary: "#028439",
        gradient: "from-[#027a2b] via-[#028439] to-[#059669]",
        accentDot: "#ea580c",
        textSubtitle: "text-[#028439]",
        borderLine: "border-emerald-100",
        sidebarText: "THE FACTORY HACKATHON · THE INNERBUILD",
        eyebrow: "THE FACTORY HACKATHON · SAISON 03",
        subtitle: "de participation au The Factory Hackathon",
        description:
          "qui a pris part au The Factory Hackathon de la Saison 03, en présentiel, et a mené son projet de la spécification à la démonstration devant le jury, dans le temps imparti.",
        lineColor: "#028439",
        nameColor: "#028439",
      }
    : {
        primary: "#ea580c",
        gradient: "from-[#ea580c] via-[#f97316] to-[#fb923c]",
        accentDot: "#16a34a",
        textSubtitle: "text-[#ea580c]",
        borderLine: "border-orange-100",
        sidebarText: "AI FACTORY ACCELERATOR · THE INNERBUILD",
        eyebrow: "AI FACTORY ACCELERATOR",
        subtitle: "de formation AI Factory Accelerator",
        description:
          "qui a suivi le parcours AI Factory Accelerator dans son intégralité, de la spécification à la livraison, et dont chaque livrable hebdomadaire a été soumis à revue jusqu'à validation.",
        lineColor: "#ea580c",
        nameColor: "#ea580c",
      };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-orange-500/20 bg-transparent">
      {/* Action buttons bar (hidden in print) */}
      <div className="actions mb-5 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          type="button"
          onClick={handleDownload}
          className={`btn-print inline-flex items-center gap-2 rounded-xl px-6 py-2.5 font-['Sora',sans-serif] text-xs font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer ${
            isHackathon
              ? "bg-gradient-to-br from-[#028439] to-[#047857] shadow-emerald-600/25 hover:shadow-emerald-600/40"
              : "bg-gradient-to-br from-[#f97316] to-[#ea580c] shadow-orange-500/25 hover:shadow-orange-500/40"
          }`}
        >
          <Download className="h-4 w-4" />
          <span>Télécharger mon Certificat (PDF)</span>
        </button>

        {canSend && onSendToDashboard && (
          <button
            type="button"
            onClick={() => onSendToDashboard(cert)}
            disabled={isSent}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 font-['Sora',sans-serif] text-xs font-bold transition-all shadow-md cursor-pointer ${
              isSent
                ? "bg-emerald-600 text-white cursor-default"
                : "bg-ink text-paper hover:bg-ink/90 shadow-ink/10 hover:-translate-y-0.5"
            }`}
          >
            {isSent ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Transmis sur le dashboard apprenant (Notifié)</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 text-accent" />
                <span>Envoyer sur le dashboard de l'apprenant</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Certificate Sheet (1120px x 792px A4 Landscape Aspect Ratio) */}
      <div
        className={`certificate relative flex w-[1120px] h-[792px] max-w-full overflow-hidden rounded-[20px] bg-[#ffffff] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border ${theme.borderLine} text-left print:shadow-none print:border-none print:rounded-none print:w-screen print:h-screen`}
      >
        {/* BANDE GAUCHE : 2 LOGOS ET TEXTE VERTICAL */}
        <div
          className={`sidebar relative w-[180px] min-w-[180px] bg-gradient-to-b ${theme.gradient} overflow-hidden z-[2] flex flex-col items-center justify-between py-10`}
        >
          {/* Subtle line background pattern */}
          <svg
            className="sidebar-pattern absolute top-0 left-0 w-full h-full opacity-[0.14] pointer-events-none"
            viewBox="0 0 180 792"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="#ffffff" strokeWidth="0.8">
              <line x1="0" y1="120" x2="180" y2="250" />
              <line x1="180" y1="250" x2="60" y2="400" />
              <line x1="60" y1="400" x2="180" y2="550" />
              <line x1="180" y1="550" x2="20" y2="700" />
              <circle cx="180" cy="250" r="3" fill="#ffffff" />
              <circle cx="60" cy="400" r="3" fill="#ffffff" />
              <circle cx="180" cy="550" r="3" fill="#ffffff" />
            </g>
          </svg>

          {/* Les 2 Logos officiels superposés */}
          <div className="relative z-[3] flex flex-col items-center gap-4">
            {isHackathon ? (
              <>
                <InnerBuildBadge size={54} />
                <FourTalentsBadge size={54} />
              </>
            ) : (
              <>
                <FourTalentsBadge size={54} />
                <InnerBuildBadge size={54} />
              </>
            )}
          </div>

          {/* Texte vertical sur la bande gauche */}
          <div
            className="sidebar-text absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 origin-center whitespace-nowrap font-['Sora',sans-serif] text-[10px] font-extrabold tracking-[3px] uppercase text-white/90 drop-shadow-xs flex items-center gap-2 select-none pointer-events-none"
            style={{ width: "max-content" }}
          >
            {theme.sidebarText}
          </div>

          {/* Bottom subtle anchor */}
          <div className="relative z-[3] text-white/50 text-[9px] font-mono tracking-widest uppercase">
            CERTIFIGO
          </div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="main-content relative flex-1 flex flex-col justify-between py-[50px] px-[65px] z-[2]">
          {/* Header */}
          <div className="header relative z-[2]">
            <p className="header-eyebrow font-['Sora',sans-serif] text-[11px] font-bold tracking-[4.5px] uppercase text-muted-foreground mb-2">
              {theme.eyebrow}
            </p>
            <h1 className="main-title font-['Sora',sans-serif] text-[54px] font-extrabold text-[#111827] leading-[1.05] tracking-[-1.5px] mb-1.5 flex items-center gap-1">
              <span>Certificat</span>
              <span
                className="inline-block w-3.5 h-3.5 rounded-[3px] ml-1 align-baseline translate-y-1"
                style={{ backgroundColor: theme.accentDot }}
              />
            </h1>
            <p
              className={`sub-title font-['Sora',sans-serif] text-[20px] font-semibold tracking-[-0.3px] ${theme.textSubtitle}`}
            >
              {theme.subtitle}
            </p>
          </div>

          {/* Recipient Block */}
          <div className="recipient relative z-[2] text-center my-auto">
            <p className="recipient-label font-['Sora',sans-serif] text-[10px] font-bold tracking-[4px] uppercase text-[#9ca3af] mb-3">
              CE CERTIFICAT EST DÉCERNÉ À
            </p>
            <h2
              className="recipient-name font-['Great_Vibes',cursive] text-[64px] font-normal leading-[1.15] mb-4"
              style={{ color: theme.nameColor }}
            >
              [ {formattedName} ]
            </h2>

            {/* Small horizontal underline */}
            <div
              className="w-16 h-[3px] rounded-full mx-auto mb-4"
              style={{ backgroundColor: theme.lineColor }}
            />

            <p className="description font-['Inter',sans-serif] text-[13px] leading-[1.7] text-[#4b5563] max-w-[620px] mx-auto">
              {cert.customText ? cert.customText : theme.description}
            </p>
          </div>

          {/* SECTION DES DEUX SIGNATAIRES AVEC LE QR CODE AU CENTRE */}
          <div className="signatures-row relative z-[2] flex items-end justify-between gap-6 pt-4 border-t border-line/40">
            {/* Signataire 1 (Gauche : Sonagnon Obed AGBOHOUN) */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: theme.lineColor }}
                />
                <span
                  className="h-[1.5px] w-full max-w-[180px] rounded-full"
                  style={{ backgroundColor: theme.lineColor }}
                />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: theme.lineColor }}
                />
              </div>
              <p className="font-['Sora',sans-serif] text-[12.5px] font-bold text-[#111827]">
                {sig1Name}
              </p>
              <p className="font-['Inter',sans-serif] text-[10.5px] text-[#6b7280] mt-0.5">
                {sig1Role}
              </p>
            </div>

            {/* QR Code de vérification Certifigo au centre */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2">
              <div className="relative p-2 rounded-xl bg-white border border-line shadow-xs">
                {/* Simulated QR Code graphic with center emblem */}
                <div className="w-[62px] h-[62px] flex items-center justify-center relative bg-paper/60 rounded-lg overflow-hidden">
                  <QrCode className="w-[58px] h-[58px] text-[#1e293b]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-md bg-white shadow-xs border border-emerald-600 flex items-center justify-center">
                      <span className="text-[9px] font-black text-emerald-700">IB</span>
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[8.5px] font-mono text-muted-foreground mt-1 tracking-wider uppercase">
                {cert.id.slice(-10)}
              </span>
            </div>

            {/* Signataire 2 (Droite : N. E. Ronald Bill HOUNNOU) */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: theme.lineColor }}
                />
                <span
                  className="h-[1.5px] w-full max-w-[180px] rounded-full"
                  style={{ backgroundColor: theme.lineColor }}
                />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: theme.lineColor }}
                />
              </div>
              <p className="font-['Sora',sans-serif] text-[12.5px] font-bold text-[#111827]">
                {sig2Name}
              </p>
              <p className="font-['Inter',sans-serif] text-[10.5px] text-[#6b7280] mt-0.5">
                {sig2Role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
