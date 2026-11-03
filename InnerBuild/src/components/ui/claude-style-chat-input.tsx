import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronDown, ArrowUp, X, FileText, Loader2, Check, Archive } from "lucide-react";

/* --- ICONS --- */
export const Icons = {
  Plus,
  Thinking: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10.3857 2.50977C14.3486 2.71054 17.5 5.98724 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 9.72386 2.72386 9.5 3 9.5C3.27614 9.5 3.5 9.72386 3.5 10C3.5 13.5899 6.41015 16.5 10 16.5C13.5899 16.5 16.5 13.5899 16.5 10C16.5 6.5225 13.7691 3.68312 10.335 3.50879L10 3.5L9.89941 3.49023C9.67145 3.44371 9.5 3.24171 9.5 3C9.5 2.72386 9.72386 2.5 10 2.5L10.3857 2.50977ZM10 5.5C10.2761 5.5 10.5 5.72386 10.5 6V9.69043L13.2236 11.0527C13.4706 11.1762 13.5708 11.4766 13.4473 11.7236C13.3392 11.9397 13.0957 12.0435 12.8711 11.9834L12.7764 11.9473L9.77637 10.4473C9.60698 10.3626 9.5 10.1894 9.5 10V6C9.5 5.72386 9.72386 5.5 10 5.5ZM3.66211 6.94141C4.0273 6.94159 4.32303 7.23735 4.32324 7.60254C4.32324 7.96791 4.02743 8.26446 3.66211 8.26465C3.29663 8.26465 3 7.96802 3 7.60254C3.00021 7.23723 3.29676 6.94141 3.66211 6.94141ZM4.95605 4.29395C5.32146 4.29404 5.61719 4.59063 5.61719 4.95605C5.6171 5.3214 5.3214 5.61709 4.95605 5.61719C4.59063 5.61719 4.29403 5.32146 4.29395 4.95605C4.29395 4.59057 4.59057 4.29395 4.95605 4.29395ZM7.60254 3C7.96802 3 8.26465 3.29663 8.26465 3.66211C8.26446 4.02743 7.96791 4.32324 7.60254 4.32324C7.23736 4.32302 6.94159 4.0273 6.94141 3.66211C6.94141 3.29676 7.23724 3.00022 7.60254 3Z" />
    </svg>
  ),
  SelectArrow: ChevronDown,
  ArrowUp,
  X,
  FileText,
  Loader2,
  Check,
  Archive,
};

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Octet";
  const k = 1024;
  const sizes = ["Octets", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

/* --- TYPES --- */
export interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: "uploading" | "complete" | "error";
  content?: string;
  wordCount?: number;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export interface ClaudeChatInputProps {
  onSendMessage: (data: {
    message: string;
    files: AttachedFile[];
    pastedContent: AttachedFile[];
    model: string;
    isThinkingEnabled: boolean;
  }) => void;
  models?: Model[];
  defaultModel?: string;
  disabled?: boolean;
  placeholder?: string;
}

const DEFAULT_MODELS: Model[] = [
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", description: "Le plus puissant, rapide et précis (128k context)", badge: "Recommandé" },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B Instant", description: "Ultra-rapide, quota maximal sans attente" },
  { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", description: "Spécialisé en synthèse et architecture" },
];

/* --- COMPONENTS --- */

// 1. File Preview Card
const FilePreviewCard: React.FC<{ file: AttachedFile; onRemove: (id: string) => void }> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/") && file.preview;

  return (
    <div className="relative group shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-line bg-card transition-all hover:border-accent/40 shadow-xs">
      {isImage ? (
        <div className="w-full h-full relative">
          <img src={file.preview!} alt={file.file.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors" />
        </div>
      ) : (
        <div className="w-full h-full p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-accent/10 text-accent rounded">
              <Icons.FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase truncate">
              {file.file.name.split(".").pop()}
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-ink truncate" title={file.file.name}>
              {file.file.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        </div>
      )}

      {/* Remove Button Overlay */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Icons.X className="w-3 h-3" />
      </button>

      {/* Upload/OCR Status */}
      {file.uploadStatus === "uploading" && (
        <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1 text-white">
          <Icons.Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span className="text-[9px] font-medium">OCR…</span>
        </div>
      )}
    </div>
  );
};

// 2. Pasted Content Card
const PastedContentCard: React.FC<{
  content: AttachedFile;
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
  return (
    <div className="relative group shrink-0 w-28 h-24 rounded-xl overflow-hidden border border-line bg-card p-2.5 flex flex-col justify-between shadow-xs">
      <div className="overflow-hidden w-full">
        <p className="text-[10px] text-muted-foreground leading-tight font-mono break-words whitespace-pre-wrap line-clamp-3 select-none">
          {content.content}
        </p>
      </div>

      <div className="flex items-center justify-between w-full mt-1">
        <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-line bg-paper">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">COLLÉ</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(content.id)}
        className="absolute top-1.5 right-1.5 p-1 bg-card border border-line rounded-full text-muted-foreground hover:text-ink transition-colors shadow-xs opacity-0 group-hover:opacity-100"
      >
        <Icons.X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

// 3. Model Selector
const ModelSelector: React.FC<{
  models: Model[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
}> = ({ models, selectedModel, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0]!;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center shrink-0 transition-colors h-8 rounded-xl px-2.5 gap-1.5 text-xs font-semibold
        ${
          isOpen
            ? "bg-accent/15 text-accent"
            : "text-muted-foreground hover:text-ink hover:bg-muted"
        }`}
      >
        <span className="truncate max-w-[85px] sm:max-w-none">{currentModel.name}</span>
        <Icons.SelectArrow className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-2 flex w-[min(280px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-xl">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onSelect(model.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl flex items-start justify-between group transition-colors hover:bg-muted"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-ink">
                    {model.name}
                  </span>
                  {model.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold border border-accent/30 text-accent bg-accent/10">
                      {model.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  {model.description}
                </span>
              </div>
              {selectedModel === model.id && (
                <Icons.Check className="w-4 h-4 text-accent shrink-0 mt-1" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 4. Main Chat Input Component
export const ClaudeChatInput: React.FC<ClaudeChatInputProps> = ({
  onSendMessage,
  models = DEFAULT_MODELS,
  defaultModel,
  disabled = false,
  placeholder = "Pose ta question au coach ou glisse un document…",
}) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel || models[0]?.id || "openai/gpt-oss-120b");
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = window.innerWidth < 640 ? 120 : 240;
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + "px";
    }
  }, [message]);

  // File Handling with real OCR integration
  const handleFiles = useCallback((newFilesList: FileList | File[]) => {
    const rawFiles = Array.from(newFilesList);
    rawFiles.forEach(async (file) => {
      const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      const tempId = Math.random().toString(36).substr(2, 9);
      const preview = isImage ? URL.createObjectURL(file) : null;

      const newAttachment: AttachedFile = {
        id: tempId,
        file,
        type: isImage ? "image" : file.type || "document",
        preview,
        uploadStatus: "uploading",
      };

      setFiles((prev) => [...prev, newAttachment]);

      try {
        // OCR/PDF engines are large; download them only after the user attaches a file.
        const { processUploadFile } = await import("@/lib/ocr");
        const extracted = await processUploadFile(file);
        setFiles((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? {
                  ...p,
                  uploadStatus: "complete" as const,
                  content: extracted.content,
                  wordCount: extracted.wordCount ?? 0,
                }
              : p
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, uploadStatus: "complete" as const } : p))
        );
      }
    });
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i]!.kind === "file") {
        const file = items[i]!.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
      return;
    }

    // Handle large text paste (> 400 chars)
    const text = e.clipboardData.getData("text");
    if (text.length > 400) {
      e.preventDefault();
      const snippet: AttachedFile = {
        id: Math.random().toString(36).substr(2, 9),
        file: new File([text], "snippet.txt", { type: "text/plain" }),
        type: "text",
        preview: null,
        uploadStatus: "complete",
        content: text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
      setPastedContent((prev) => [...prev, snippet]);
    }
  };

  const handleSend = () => {
    if ((!message.trim() && files.length === 0 && pastedContent.length === 0) || disabled) return;
    onSendMessage({
      message: message.trim(),
      files,
      pastedContent,
      model: selectedModel,
      isThinkingEnabled,
    });
    setMessage("");
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim() || files.length > 0 || pastedContent.length > 0;

  return (
    <div
      className="relative w-full max-w-3xl mx-auto transition-all duration-300 font-sans"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-stretch transition-all rounded-2xl border border-line bg-card shadow-sm hover:shadow-md focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
        <div className="flex flex-col px-3.5 pt-3 pb-2.5 gap-2">
          {/* 1. Artifacts (Files & Pastes) */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 px-0.5">
              {pastedContent.map((content) => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  onRemove={(id) => setPastedContent((prev) => prev.filter((c) => c.id !== id))}
                />
              ))}
              {files.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
                />
              ))}
            </div>
          )}

          {/* 2. Text Input Area */}
          <div className="relative min-h-[2.5rem]">
            <textarea
              ref={textareaRef}
              value={message}
              disabled={disabled}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="block w-full resize-none overflow-y-auto border-0 bg-transparent py-1 text-base leading-relaxed text-ink outline-none placeholder:text-muted-foreground sm:text-[15px]"
              rows={1}
            />
          </div>

          {/* 3. Action Toolbar */}
          <div className="flex gap-2 w-full items-center justify-between pt-1 border-t border-line/40">
            {/* Left Tools */}
            <div className="flex items-center gap-1.5">
              {/* Attach Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-ink hover:bg-muted transition-colors active:scale-95"
                title="Joindre un fichier ou image pour OCR"
              >
                <Icons.Plus className="w-4 h-4" />
              </button>

              {/* Extended Thinking Button */}
              <button
                type="button"
                onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                disabled={disabled}
                className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                  isThinkingEnabled
                    ? "text-accent bg-accent/15 border border-accent/30 shadow-xs"
                    : "text-muted-foreground hover:text-ink hover:bg-muted"
                }`}
                title="Activer la chaîne de réflexion détaillée de l'IA (ThoughtChain)"
              >
                <Icons.Thinking className="w-4 h-4" />
                <span className="hidden sm:inline">Mode Pensée</span>
              </button>
            </div>

            {/* Right Tools: Model selector & Send */}
            <div className="flex items-center gap-2">
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent || disabled}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-xl transition-all active:scale-95 ${
                  hasContent && !disabled
                    ? "bg-accent text-paper shadow-sm hover:brightness-105"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                }`}
                title="Envoyer le message (Entrée)"
              >
                <Icons.ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-paper/95 border-2 border-dashed border-accent rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-xs pointer-events-none">
          <Icons.Archive className="w-8 h-8 text-accent mb-2 animate-bounce" />
          <p className="text-sm font-bold text-accent">Dépose tes fichiers ici pour analyse OCR</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.py"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ClaudeChatInput;
