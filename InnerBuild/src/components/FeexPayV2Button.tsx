import { useEffect, useState, useId } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    FeexPayButton?: {
      init: (containerId: string, options: any) => void;
    };
  }
}

export type FeexPayV2Props = {
  shopId: string;
  token: string;
  amount: number;
  description: string;
  customId?: string;
  currency?: string;
  mode?: "SANDBOX" | "LIVE";
  buttonText?: string;
  buttonClass?: string;
  callbackUrl?: string;
  errorCallbackUrl?: string;
  callbackInfo?: Record<string, any>;
  defaultValueField?: Record<string, any>;
  callback?: (response: any) => void;
};

export function FeexPayV2Button({
  shopId,
  token,
  amount,
  description,
  customId,
  currency = "XOF",
  mode = "LIVE",
  buttonText,
  buttonClass,
  callbackUrl,
  errorCallbackUrl,
  callbackInfo,
  defaultValueField,
  callback,
}: FeexPayV2Props) {
  const containerId = useId().replace(/:/g, "_");
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    const scriptId = "feexpay-v2-sdk-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://api-v2.feexpay.me/feexpay-javascript-sdk/index.js";
      script.async = true;
      script.onload = () => setSdkLoaded(true);
      script.onerror = () => toast.error("Impossible de charger le SDK FeexPay V2");
      document.head.appendChild(script);
    } else if (window.FeexPayButton) {
      setSdkLoaded(true);
    } else {
      const handleLoad = () => setSdkLoaded(true);
      existingScript.addEventListener("load", handleLoad);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!sdkLoaded || !window.FeexPayButton) return;

    try {
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = "";

      // Nettoyer la description pour éviter tout rejet de caractères spéciaux
      const sanitizedDescription = (description || "Paiement AI Factory")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim();

      const pageUrl = typeof window !== "undefined" ? window.location.href : "";

      // Sanitization du defaultValueField si fourni
      let sanitizedDefaultFields = defaultValueField ? { ...defaultValueField } : undefined;
      if (sanitizedDefaultFields && sanitizedDefaultFields["reseau"]) {
        let r = String(sanitizedDefaultFields["reseau"]).toUpperCase().trim();
        if (r === "CELTIIS") r = "CELTIIS BJ";
        sanitizedDefaultFields["reseau"] = r;
      }

      window.FeexPayButton.init(containerId, {
        id: shopId,
        token: token,
        amount: amount,
        currency: currency,
        description: sanitizedDescription,
        mode: mode,
        custom_id: customId || `REF-${Date.now()}`,
        callback_url: callbackUrl || pageUrl,
        error_callback_url: errorCallbackUrl || pageUrl,
        callback_info: callbackInfo,
        defaultValueField: sanitizedDefaultFields,
        buttonText: buttonText || `Payer la Tranche (${amount.toLocaleString("fr-FR")} F CFA) avec FeexPay`,
        buttonClass:
          buttonClass ||
          "w-full py-3 px-5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm",
        callback: (res: any) => {
          if (callback) callback(res);
        },
      });
    } catch (err) {
      console.error("[FeexPay V2 Init Error]", err);
    }
  }, [
    sdkLoaded,
    shopId,
    token,
    amount,
    description,
    currency,
    mode,
    customId,
    callbackUrl,
    errorCallbackUrl,
    callbackInfo,
    defaultValueField,
    buttonText,
    buttonClass,
    containerId,
    callback,
  ]);

  return (
    <div className="w-full">
      <div id={containerId} className="w-full min-h-[48px] flex items-center justify-center">
        {!sdkLoaded && (
          <button
            disabled
            className={
              buttonClass ||
              "w-full py-3.5 px-5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 opacity-90 flex items-center justify-center gap-2 text-sm"
            }
          >
            {buttonText || `Payer la Tranche (${amount.toLocaleString("fr-FR")} F CFA)`}
          </button>
        )}
      </div>
    </div>
  );
}
