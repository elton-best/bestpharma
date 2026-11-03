import { useLanguage, type Language } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-full border border-line bg-paper/80 p-0.5 backdrop-blur-sm ${className}`}>
      <span className="sr-only">Langue</span>
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold font-mono transition-all ${
          lang === "fr"
            ? "bg-[#023010] text-white shadow-sm"
            : "text-[#5C6660] hover:text-[#1F2420]"
        }`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold font-mono transition-all ${
          lang === "en"
            ? "bg-[#023010] text-white shadow-sm"
            : "text-[#5C6660] hover:text-[#1F2420]"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSelector;
