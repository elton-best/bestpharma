import React from "react";

/**
 * Composant d'illustration 3D d'officine reproduisant fidèlement l'Image 3 :
 * - Châssis écran tablette aux coins très arrondis et bordure sombre
 * - Pharmacien barbu avec lunettes et pull vert lime au bureau
 * - Ordinateur portable, tasse de café fumante, smartphone, crayon jaune
 * - Horloge murale noire, meuble d'officine avec plante, sansevière au sol
 * - Sol vert forêt Move Green (#0F3B27) et mur pastel doux
 */
export function AuthTabletIllustration() {
  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-full flex items-center justify-center p-4 sm:p-8 select-none overflow-hidden">
      {/* Horloge murale style Image 3 */}
      <div className="absolute top-8 right-12 z-10 size-14 rounded-full border-4 border-[#1C261F] bg-white shadow-md flex items-center justify-center">
        {/* Cadran et aiguilles */}
        <div className="relative size-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-[#1C261F]" />
          {/* Aiguille des heures (vers 10h) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-[#1C261F] origin-bottom -rotate-45" />
          {/* Aiguille des minutes (vers 2h) */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#1C261F] origin-bottom rotate-45" />
        </div>
      </div>

      {/* Meuble de rangement blanc à gauche */}
      <div className="absolute bottom-28 left-4 sm:left-8 z-10 w-20 sm:w-24 rounded-2xl bg-white border border-[#CFF1D2] shadow-lg p-2 flex flex-col gap-2">
        {/* Petite plante succulente sur le meuble */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-5 h-6 rounded-t-full bg-emerald-600 border border-emerald-700 shadow-xs" />
          <div className="w-6 h-4 rounded-b-md bg-white border border-gray-200 shadow-2xs" />
        </div>
        <div className="h-6 rounded-lg bg-[#F7F9F7] border border-gray-100" />
        <div className="h-6 rounded-lg bg-[#F7F9F7] border border-gray-100" />
        <div className="h-6 rounded-lg bg-[#F7F9F7] border border-gray-100" />
      </div>

      {/* SVG Scène Pharmacien 3D stylisée */}
      <div className="relative z-10 w-full max-w-[420px] aspect-[4/3] flex items-end justify-center">
        <svg
          viewBox="0 0 500 450"
          className="w-full h-auto drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sol Vert Forêt Move Green (#0F3B27) */}
          <rect y="280" width="500" height="170" fill="#0F3B27" />

          {/* Plante Sansevière (Snake Plant) dans pot hexagonal à droite */}
          <g transform="translate(380, 200)">
            {/* Feuilles élancées */}
            <path
              d="M30 110 C20 60, 22 20, 32 0 C40 20, 42 60, 32 110 Z"
              fill="#2E7D32"
            />
            <path
              d="M15 110 C5 70, 8 35, 18 15 C24 35, 26 70, 18 110 Z"
              fill="#388E3C"
            />
            <path
              d="M48 110 C40 75, 42 40, 50 20 C56 40, 56 75, 50 110 Z"
              fill="#1B5E20"
            />
            {/* Liserés jaunes des feuilles */}
            <path
              d="M30 110 C20 60, 22 20, 32 0"
              stroke="#92FF5F"
              strokeWidth="2.5"
            />
            <path
              d="M15 110 C5 70, 8 35, 18 15"
              stroke="#92FF5F"
              strokeWidth="2"
            />
            {/* Pot hexagonal blanc / gris clair */}
            <polygon
              points="10,110 52,110 58,160 4,160"
              fill="#E8ECE9"
              stroke="#D0D7D2"
              strokeWidth="2"
            />
            <polygon
              points="10,110 31,110 31,160 4,160"
              fill="#DCE2DD"
            />
          </g>

          {/* Chaise de bureau ergonomique */}
          <g transform="translate(180, 160)">
            {/* Dossier gris moderne arrondi */}
            <rect x="25" y="40" width="80" height="95" rx="36" fill="#88929A" />
            <rect x="33" y="48" width="64" height="80" rx="30" fill="#9FAAB3" />
            {/* Assise */}
            <rect x="15" y="130" width="100" height="22" rx="10" fill="#758189" />
            {/* Pied central et branches à roulettes */}
            <rect x="60" y="152" width="10" height="40" fill="#4B5563" />
            <path d="M20 192 L110 192" stroke="#4B5563" strokeWidth="6" strokeLinecap="round" />
            <circle cx="20" cy="195" r="5" fill="#1F2937" />
            <circle cx="65" cy="195" r="5" fill="#1F2937" />
            <circle cx="110" cy="195" r="5" fill="#1F2937" />
          </g>

          {/* Pharmacien (Personnage 3D stylisé) */}
          <g transform="translate(180, 80)">
            {/* Tête */}
            <circle cx="65" cy="55" r="28" fill="#F4C7A5" />
            {/* Cheveux bruns stylés */}
            <path
              d="M38 55 C38 25, 92 25, 92 55 C92 38, 80 25, 65 25 C50 25, 38 38, 38 55 Z"
              fill="#422216"
            />
            {/* Barbe et moustache soignées */}
            <path
              d="M48 62 C48 82, 82 82, 82 62 C78 72, 52 72, 48 62 Z"
              fill="#422216"
            />
            {/* Sourire amical */}
            <path d="M57 66 Q65 72 73 66" stroke="#422216" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Lunettes noires modernes */}
            <rect x="47" y="46" width="15" height="12" rx="3" stroke="#1F2937" strokeWidth="2.5" fill="none" />
            <rect x="68" y="46" width="15" height="12" rx="3" stroke="#1F2937" strokeWidth="2.5" fill="none" />
            <line x1="62" y1="52" x2="68" y2="52" stroke="#1F2937" strokeWidth="2.5" />
            {/* Yeux souriants */}
            <circle cx="54" cy="52" r="2" fill="#1F2937" />
            <circle cx="75" cy="52" r="2" fill="#1F2937" />

            {/* Col de chemise bleue sous le pull */}
            <polygon points="56,82 65,96 74,82" fill="#3B82F6" />

            {/* Pull vert lime éclatant (#92FF5F / #84E854) */}
            <path
              d="M38 85 C38 85, 52 82, 65 82 C78 82, 92 85, 92 85 L102 155 C102 155, 65 160, 28 155 Z"
              fill="#92FF5F"
            />
            {/* Manches du pull */}
            <path
              d="M38 85 L15 135 C15 135, 25 145, 35 140 L48 110 Z"
              fill="#85ED52"
            />
            <path
              d="M92 85 L115 135 C115 135, 105 145, 95 140 L82 110 Z"
              fill="#85ED52"
            />

            {/* Mains posées sur le clavier */}
            <circle cx="28" cy="142" r="7" fill="#F4C7A5" />
            <circle cx="102" cy="142" r="7" fill="#F4C7A5" />

            {/* Pantalon bleu */}
            <rect x="42" y="155" width="22" height="75" rx="8" fill="#2563EB" />
            <rect x="66" y="155" width="22" height="75" rx="8" fill="#1D4ED8" />

            {/* Chaussures baskets violettes avec semelle blanche comme sur l'Image 3 */}
            <g transform="translate(38, 225)">
              <rect x="0" y="0" width="28" height="18" rx="7" fill="#7C3AED" />
              <rect x="-2" y="15" width="32" height="6" rx="3" fill="#FFFFFF" />
              {/* Lacets blancs */}
              <line x1="8" y1="5" x2="18" y2="5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="9" x2="18" y2="9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g transform="translate(68, 225)">
              <rect x="0" y="0" width="28" height="18" rx="7" fill="#6D28D9" />
              <rect x="-2" y="15" width="32" height="6" rx="3" fill="#FFFFFF" />
              <line x1="8" y1="5" x2="18" y2="5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="9" x2="18" y2="9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          {/* Bureau moderne (Plateau Vert Foncé #0F3B27 avec biseau blanc & pieds blancs) */}
          <g transform="translate(60, 205)">
            {/* Pieds blancs du bureau */}
            <rect x="25" y="25" width="8" height="145" rx="4" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
            <rect x="235" y="25" width="8" height="145" rx="4" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />

            {/* Plateau du bureau */}
            <rect x="0" y="0" width="270" height="26" rx="13" fill="#0F3B27" stroke="#FFFFFF" strokeWidth="4" />

            {/* Objets sur le bureau */}
            {/* Crayon jaune à gauche */}
            <rect x="18" y="-4" width="26" height="5" rx="2" fill="#FACC15" transform="rotate(-10 18 -4)" />

            {/* Ordinateur portable métallique (MacBook) */}
            <g transform="translate(75, -55)">
              {/* Écran ouvert */}
              <rect x="5" y="0" width="80" height="54" rx="5" fill="#374151" stroke="#9CA3AF" strokeWidth="2" />
              <rect x="9" y="4" width="72" height="46" rx="3" fill="#1F2937" />
              {/* Pomme / logo discret au dos */}
              <circle cx="45" cy="27" r="4" fill="#9CA3AF" />
              {/* Base / Clavier */}
              <polygon points="0,55 90,55 82,62 8,62" fill="#D1D5DB" />
            </g>

            {/* Smartphone noir */}
            <rect x="175" y="5" width="22" height="12" rx="3" fill="#111827" />

            {/* Tasse à café bleue fumante */}
            <g transform="translate(205, -12)">
              <rect x="0" y="6" width="18" height="18" rx="4" fill="#3B82F6" />
              {/* Anse */}
              <path d="M18 10 C23 10, 23 20, 18 20" stroke="#3B82F6" strokeWidth="3" fill="none" />
              {/* Vapeur de café */}
              <path d="M5 2 Q8 -2 5 -6" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
              <path d="M12 2 Q15 -2 12 -6" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
            </g>
          </g>
        </svg>
      </div>

      {/* Badge flottant BPD Bénin */}
      <div className="absolute bottom-6 left-8 z-20 hidden sm:inline-flex items-center gap-2 rounded-full bg-[#0F3B27]/85 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white border border-[#92FF5F]/40 shadow-md">
        <span className="size-2 rounded-full bg-[#92FF5F] animate-pulse" />
        Officine Connectée · Conforme BPD Bénin
      </div>
    </div>
  );
}
