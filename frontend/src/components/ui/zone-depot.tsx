import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, Loader2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export interface InfoFichierTeleverse {
  url: string;
  filename: string;
  original_name: string;
  size: number;
}

interface ZoneDepotProps {
  label: string;
  aide?: string;
  accept?: string;
  dossier?: string;
  valeurUrl?: string;
  valeurNom?: string;
  maxTailleMo?: number;
  onUploadSuccess?: (file: InfoFichierTeleverse) => void;
  onFiles?: (files: FileList) => void;
  className?: string;
}

export function ZoneDepot({
  label,
  aide,
  accept = ".jpg,.jpeg,.png,.webp,.heic,.pdf,.csv,.xlsx",
  dossier = "documents",
  valeurUrl,
  valeurNom,
  maxTailleMo = 10,
  onUploadSuccess,
  onFiles,
  className = "",
}: ZoneDepotProps) {
  const [dragOver, setDragOver] = useState(false);
  const [televersement, setTeleversement] = useState(false);
  const [fichierActuel, setFichierActuel] = useState<{ url: string; nom: string; taille?: number } | null>(
    valeurUrl ? { url: valeurUrl, nom: valeurNom || "Document joint" } : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const traiterFichiers = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles?.(files);

    const file = files[0];
    if (file.size > maxTailleMo * 1024 * 1024) {
      toast.error(`Le fichier dépasse la taille maximale autorisée (${maxTailleMo} Mo).`);
      return;
    }

    setTeleversement(true);
    try {
      const res = await api.uploadFile<InfoFichierTeleverse>(
        "/upload",
        file,
        { dossier }
      );
      const info = {
        url: res.url,
        nom: res.original_name || file.name,
        taille: res.size || file.size,
      };
      setFichierActuel(info);
      onUploadSuccess?.(res);
      toast.success(`Fichier "${info.nom}" téléversé et archivé avec succès.`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement du fichier.");
    } finally {
      setTeleversement(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    traiterFichiers(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    traiterFichiers(e.target.files);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !televersement && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-5 text-center rounded-[10px] border-2 border-dashed transition-all cursor-pointer ${
          dragOver
            ? "border-[#0F3B27] bg-[#CFF1D2]/30 scale-[0.99]"
            : "border-[#CFF1D2] bg-[#F7F9F7] hover:bg-[#F2F8F3] hover:border-[#0F3B27]/40"
        }`}
      >
        {televersement ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="size-7 animate-spin text-[#0F3B27]" />
            <p className="text-xs font-bold text-[#0F3B27]">Chiffrement & téléversement sécurisé...</p>
          </div>
        ) : fichierActuel ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center justify-between w-full p-2.5 rounded-[8px] bg-white border border-[#CFF1D2] shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-[#0F3B27] truncate max-w-[200px] sm:max-w-xs">
                  {fichierActuel.nom}
                </span>
                {fichierActuel.taille ? (
                  <span className="text-[10px] text-[#475C50] font-mono">
                    ({Math.round(fichierActuel.taille / 1024)} Ko)
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {fichierActuel.url && (
                  <a
                    href={fichierActuel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-[#CFF1D2]/40 rounded text-[#0F3B27]"
                    title="Voir ou télécharger"
                  >
                    <Download className="size-3.5" />
                  </a>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFichierActuel(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Supprimer la sélection"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-[#475C50]">Cliquez ou glissez un nouveau fichier pour remplacer</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="size-10 rounded-full bg-white border border-[#CFF1D2] shadow-2xs flex items-center justify-center text-[#0F3B27] group-hover:scale-110 transition-transform">
              <Upload className="size-5 text-[#0F3B27]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F3B27]">{label}</p>
              <p className="text-[11px] text-[#475C50] mt-0.5">
                {aide || `Glissez-déposez ou parcourez (max ${maxTailleMo} Mo · PDF, JPG, PNG)`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
