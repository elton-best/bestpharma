import { useState } from "react";

/**
 * Logo officiel THE INNERBUILD
 * Utilise l'icône de marque officielle (monogramme IB blanc sur fond vert)
 */
export function LogoMark({
  className = "h-8 w-8",
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const px = size ?? 36;

  if (!imgError) {
    return (
      <img
        src="/the-innerbuild-logo.png"
        alt="The InnerBuild"
        width={px}
        height={px}
        onError={() => setImgError(true)}
        className={`shrink-0 rounded-xl object-contain shadow-xs ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  // Fallback vectoriel pur en cas de chargement différé
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      role="img"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <rect x="0" y="0" width="40" height="40" rx="10" fill="#023010" />
      <path
        d="M12 20 L20 12 L28 20 L20 28 Z"
        fill="none"
        stroke="#18AA38"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="3" fill="#ffffff" />
    </svg>
  );
}

/**
 * Nouveau logo vectoriel d'ingénierie conservé pour les agents IA et l'assistant intérieur
 */
export function AgentLogoMark({
  className = "h-8 w-8",
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  const px = size ?? 36;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      role="img"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#023010" />
      <rect x="2" y="2" width="36" height="36" rx="9" fill="none" stroke="#CFE3D5" strokeWidth="1" opacity="0.3" />
      <path
        d="M12 20 L20 12 L28 20 L20 28 Z"
        fill="none"
        stroke="#18AA38"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="3" fill="#ffffff" />
      <rect x="13" y="31" width="14" height="2.5" rx="1.25" fill="#18AA38" />
    </svg>
  );
}

export function Logo({
  size = 36,
  compact = false,
  className = "",
  light = false,
  subtitle,
}: {
  size?: number;
  compact?: boolean;
  className?: string;
  light?: boolean;
  subtitle?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="The InnerBuild">
      <LogoMark size={size} />
      {compact ? null : (
        <span className="leading-tight">
          <span
            className={`block font-display text-[15px] font-black tracking-tight ${
              light ? "text-white" : "text-[#023010]"
            }`}
          >
            THE INNERBUILD
          </span>
          <span
            className={`block text-[10px] font-mono uppercase tracking-wider font-semibold ${
              light ? "text-emerald-300" : "text-[#5C6660]"
            }`}
          >
            {subtitle || "FORGE D'INGÉNIERIE & SAISONS"}
          </span>
        </span>
      )}
    </span>
  );
}

export default Logo;
