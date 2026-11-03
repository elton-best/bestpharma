import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  FileCode,
  Folder,
  FolderOpen,
  Send,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  Code2,
  ExternalLink,
  Laptop,
  Search,
  RefreshCw,
  Eye,
  Edit3,
  Bot,
  Cpu,
  Boxes,
  Zap,
  X,
  Plus,
  Columns,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Trash2,
  FolderPlus,
  FilePlus,
  PanelLeft,
  PanelRight,
  Maximize2,
  Layers,
} from "lucide-react";
import { appHead } from "@/components/app/AppShell";
import { toast } from "@/components/ui/heroui-toast";
import { Markdown } from "@/components/app/AiChat";
import { LogoMark } from "@/components/Logo";
import ThinkingState, { type ThinkingRow } from "@/components/ui/thinking";
import {
  ClaudeChatInput,
  type AttachedFile,
  type Model as ClaudeModel,
} from "@/components/ui/claude-style-chat-input";
import {
  askBuildingArchitect,
  type VirtualFile,
  type SkillRecommendation,
} from "@/lib/building.functions";

export const Route = createFileRoute("/app/building")({
  head: appHead(
    "Building Studio — Architecte IA",
    "Structurez votre projet complet avec les agents AI Factory : cahier des charges markdown, arborescence sur mesure, découpage MVP/V1/V2 et affectation des 219 skills."
  ),
  component: BuildingStudioPage,
});

const CHAT_MODELS: ClaudeModel[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Architecte & Raisonnement approfondi (128k context)",
    badge: "Recommandé",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B Instant",
    description: "Ultra-rapide, génération instantanée d'architecture",
    badge: "Ultra-Rapide",
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    description: "Code, Algorithmes & Architecture",
  },
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachmentName?: string | undefined;
  thinkingRows?: ThinkingRow[];
}

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

const PROJECTS_INDEX_KEY = "aifac_building_projects_index_v6";
const ACTIVE_PROJECT_KEY = "aifac_building_active_id_v6";

const DEFAULT_STARTER_FILES: Record<string, VirtualFile> = {
  "specs/cahier-des-charges.md": {
    path: "specs/cahier-des-charges.md",
    name: "cahier-des-charges.md",
    language: "markdown",
    category: "spec",
    content: `# CAHIER DES CHARGES TECHNIQUE & FONCTIONNEL
## Projet : Mon Projet SaaS

*Document certifié AI Factory — Méthodologie Spec → Plan → Build → Deliver*

### 1. Synthèse du Projet
Conception et déploiement d'une application logicielle moderne, modulaire et hautement sécurisée.
Discutez avec **l'Architecte IA AI Factory** dans le panneau central pour détailler votre projet et générer automatiquement l'ensemble des spécifications adaptées.

### 2. Niveaux Stratégiques de Livraison
- **Niveau 1 (MVP)** : Périmètre prioritaire livrable en fin de Semaine 1.
- **Niveau 2 (V1)** : Fonctionnalités d'automatisation, intégrations et paiements.
- **Niveau 3 (V2)** : Échelle, monitoring avancé et autonomie multi-agents.
`,
  },
  "src/index.ts": {
    path: "src/index.ts",
    name: "index.ts",
    language: "typescript",
    category: "code",
    content: `// Point d'entrée principal de l'application
export function bootstrap() {
  console.log("AI Factory Building Studio — Projet prêt");
}
`,
  },
  ".cursor/rules": {
    path: ".cursor/rules",
    name: "rules",
    language: "markdown",
    category: "config",
    content: `# Directives AI Factory pour Agents IA (Cursor / Windsurf)
- Typage strict TypeScript, code modulaire et tests automatisés.
- RLS systématique sur Supabase.
- Méthodologie Spec -> Plan -> Build -> Deliver.
`,
  },
};

const PRESET_IDEAS = [
  {
    title: "SaaS Devis & Facturation IA",
    desc: "Génération automatique de devis B2B avec relances intelligentes et paiement Stripe/Wave",
  },
  {
    title: "Marketplace Freelances & Services",
    desc: "Mise en relation avec escrow, chat en temps réel, notations et paiements Mobile Money",
  },
  {
    title: "Agent IA Scraping & Veille",
    desc: "Crawler autonome qui surveille la concurrence, résume les offres et envoie des alertes",
  },
  {
    title: "Plateforme d'Abonnement Vidéo",
    desc: "Streaming sécurisé, paywall mensuel, espace communautaire et gestion des accès",
  },
];

function BuildingStudioPage() {
  // 1. Projects index in LocalStorage
  const [projects, setProjects] = useState<ProjectSummary[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_INDEX_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ id: "proj-1", name: "Mon Projet SaaS", updatedAt: new Date().toISOString() }];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (saved) return saved;
    } catch {}
    return "proj-1";
  });

  const projectStoragePrefix = `aifac_building_proj_${activeProjectId}`;

  // Project attributes state
  const [projectName, setProjectName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${projectStoragePrefix}_name`);
      if (saved) return saved;
    } catch {}
    return "Mon Projet SaaS";
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem(`${projectStoragePrefix}_model`) || "openai/gpt-oss-120b";
    } catch {
      return "openai/gpt-oss-120b";
    }
  });

  const [virtualFiles, setVirtualFiles] = useState<Record<string, VirtualFile>>(() => {
    try {
      const saved = localStorage.getItem(`${projectStoragePrefix}_files`);
      return saved ? JSON.parse(saved) : DEFAULT_STARTER_FILES;
    } catch {
      return DEFAULT_STARTER_FILES;
    }
  });

  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${projectStoragePrefix}_custom_folders`);
      return saved ? JSON.parse(saved) : ["specs", "src"];
    } catch {
      return ["specs", "src"];
    }
  });

  const [recommendedSkills, setRecommendedSkills] = useState<SkillRecommendation[]>(() => {
    try {
      const saved = localStorage.getItem(`${projectStoragePrefix}_skills`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`${projectStoragePrefix}_messages`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "m0",
        role: "assistant",
        content: `Bonjour ! Je suis ton **Lead Architecte & Tech Lead IA** d'AI Factory.

Partage-moi ton idée de projet (même en 2 ou 3 phrases). Je vais immédiatement :
1. Structurer ton projet en **3 niveaux clairs (MVP Semaine 1, V1, V2)** avec un haut niveau de détail technique.
2. Générer le **Cahier des Charges complet (\`specs/cahier-des-charges.md\`)** immédiatement consultable et téléchargeable.
3. Créer **l'arborescence accordéon** sur la gauche avec tes dossiers et fichiers personnalisés.
4. **Affecter les 219 skills AIFAC adaptés à chaque feature** pour que tes agents IA (Cursor, Windsurf, Claude Code) exécutent le code sans dérive.

*Tu peux aussi poser des questions d'architecture ou cliquer sur une suggestion pour démarrer.*`,
        timestamp: "Maintenant",
        thinkingRows: [
          { primary: "Initialisation du Studio Building AIFAC" },
          { primary: "Vérification des 219 skills disponibles" },
          { primary: "Prêt à cadrer votre projet en 3 niveaux (MVP, V1, V2)" },
        ],
      },
    ];
  });

  // UI state for panels (VS Code style)
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [showDocPanel, setShowDocPanel] = useState(true);
  const [splitView, setSplitView] = useState(false);
  const [mobileTab, setMobileTab] = useState<"tree" | "chat" | "editor">("chat");

  // Document & editor state
  const [activeFilePath, setActiveFilePath] = useState<string>("specs/cahier-des-charges.md");
  const [docViewMode, setDocViewMode] = useState<"preview" | "code">("preview");
  const [searchFileQuery, setSearchFileQuery] = useState("");

  // Folders accordion state (dynamic for any folder)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    specs: true,
    src: true,
  });

  const toggleFolder = (folderName: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderName]: prev[folderName] === false ? true : false }));
  };

  // UI Modals state
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFilePathInput, setNewFilePathInput] = useState("");
  const [targetFolderForNewFile, setTargetFolderForNewFile] = useState("");

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync active project state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${projectStoragePrefix}_name`, projectName);
      localStorage.setItem(`${projectStoragePrefix}_model`, selectedModel);
      localStorage.setItem(`${projectStoragePrefix}_files`, JSON.stringify(virtualFiles));
      localStorage.setItem(`${projectStoragePrefix}_skills`, JSON.stringify(recommendedSkills));
      localStorage.setItem(`${projectStoragePrefix}_custom_folders`, JSON.stringify(customFolders));
      localStorage.setItem(`${projectStoragePrefix}_messages`, JSON.stringify(messages));

      setProjects((prev) => {
        const next = prev.map((p) =>
          p.id === activeProjectId
            ? { ...p, name: projectName, updatedAt: new Date().toISOString() }
            : p
        );
        localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(next));
        return next;
      });
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    } catch {}
  }, [activeProjectId, projectStoragePrefix, projectName, selectedModel, virtualFiles, recommendedSkills, customFolders, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Switch to another project
  function handleSwitchProject(id: string) {
    if (id === activeProjectId) return;
    const prefix = `aifac_building_proj_${id}`;
    const pMeta = projects.find((p) => p.id === id);

    let savedName = pMeta?.name || "Mon Projet SaaS";
    let savedModel = "openai/gpt-oss-120b";
    let savedFiles = DEFAULT_STARTER_FILES;
    let savedFolders = ["specs", "src"];
    let savedSkills: SkillRecommendation[] = [];
    let savedMsgs = messages;

    try {
      const n = localStorage.getItem(`${prefix}_name`);
      if (n) savedName = n;
      const m = localStorage.getItem(`${prefix}_model`);
      if (m) savedModel = m;
      const f = localStorage.getItem(`${prefix}_files`);
      if (f) savedFiles = JSON.parse(f);
      const fol = localStorage.getItem(`${prefix}_custom_folders`);
      if (fol) savedFolders = JSON.parse(fol);
      const s = localStorage.getItem(`${prefix}_skills`);
      if (s) savedSkills = JSON.parse(s);
      const msg = localStorage.getItem(`${prefix}_messages`);
      if (msg) savedMsgs = JSON.parse(msg);
    } catch {}

    setActiveProjectId(id);
    setProjectName(savedName);
    setSelectedModel(savedModel);
    setVirtualFiles(savedFiles);
    setCustomFolders(savedFolders);
    setRecommendedSkills(savedSkills);
    setMessages(savedMsgs);
    const firstFile = Object.keys(savedFiles)[0] || "";
    setActiveFilePath(firstFile);
    setIsProjectDropdownOpen(false);
    toast.success(`Projet « ${savedName} » chargé.`);
  }

  // Create new project with clean, custom architecture
  function handleCreateNewProject() {
    const name = newProjectNameInput.trim() || `Projet ${projects.length + 1}`;
    const newId = `proj-${Date.now()}`;
    const newSummary: ProjectSummary = {
      id: newId,
      name,
      updatedAt: new Date().toISOString(),
    };

    // Clean initial file for a fresh project (user builds their own folders)
    const initialFiles: Record<string, VirtualFile> = {
      "README.md": {
        path: "README.md",
        name: "README.md",
        language: "markdown",
        category: "spec",
        content: `# ${name}

Bienvenue dans votre nouveau projet.

### Architecture du Projet :
- Utilisez le bouton **« + Dossier »** et **« + Fichier »** dans l'arborescence à gauche pour créer votre propre structure.
- Échangez avec l'**Agent Architecte IA** au centre pour cadrer vos spécifications techniques (MVP, V1, V2).
- Le cahier des charges et vos fichiers de code apparaîtront automatiquement dans l'éditeur.
`,
      },
    };

    const nextProjects = [...projects, newSummary];
    setProjects(nextProjects);
    try {
      localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(nextProjects));
    } catch {}

    setActiveProjectId(newId);
    setProjectName(name);
    setSelectedModel("openai/gpt-oss-120b");
    setVirtualFiles(initialFiles);
    setCustomFolders([]);
    setRecommendedSkills([]);
    setMessages([
      {
        id: `m-${Date.now()}`,
        role: "assistant",
        content: `Bienvenue dans ton nouveau projet **${name}** ! 

L'architecture est vierge : tu peux créer tes propres dossiers et fichiers dans l'arborescence, ou simplement me décrire ce que tu veux construire pour que je génère le cahier des charges et les fichiers adaptés.`,
        timestamp: "Maintenant",
        thinkingRows: [
          { primary: `Initialisation du projet ${name}` },
          { primary: "Architecture vierge prête pour personnalisation" },
        ],
      },
    ]);
    setActiveFilePath("README.md");
    setIsNewProjectModalOpen(false);
    setNewProjectNameInput("");
    setIsProjectDropdownOpen(false);
    toast.success(`Nouveau projet « ${name} » créé !`);
  }

  // Delete project
  function handleDeleteCurrentProject() {
    const targetId = activeProjectId;
    const targetName = projectName;

    try {
      localStorage.removeItem(`aifac_building_proj_${targetId}_name`);
      localStorage.removeItem(`aifac_building_proj_${targetId}_model`);
      localStorage.removeItem(`aifac_building_proj_${targetId}_files`);
      localStorage.removeItem(`aifac_building_proj_${targetId}_custom_folders`);
      localStorage.removeItem(`aifac_building_proj_${targetId}_skills`);
      localStorage.removeItem(`aifac_building_proj_${targetId}_messages`);
    } catch {}

    const remaining = projects.filter((p) => p.id !== targetId);

    if (remaining.length === 0) {
      const defaultId = `proj-${Date.now()}`;
      const defaultProj: ProjectSummary = {
        id: defaultId,
        name: "Mon Projet SaaS",
        updatedAt: new Date().toISOString(),
      };
      setProjects([defaultProj]);
      try {
        localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify([defaultProj]));
      } catch {}
      handleSwitchProject(defaultId);
    } else {
      setProjects(remaining);
      try {
        localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(remaining));
      } catch {}
      if (remaining[0]) {
        handleSwitchProject(remaining[0].id);
      }
    }

    setIsDeleteModalOpen(false);
    toast.success(`Le projet « ${targetName} » a été supprimé.`);
  }

  // Add new folder
  function handleConfirmNewFolder() {
    const raw = newFolderNameInput.trim().replace(/^\/+|\/+$/g, "");
    if (!raw) {
      toast.error("Veuillez renseigner un nom de dossier valide.");
      return;
    }
    if (!customFolders.includes(raw)) {
      setCustomFolders((prev) => [...prev, raw]);
      setOpenFolders((prev) => ({ ...prev, [raw]: true }));
    }
    setIsNewFolderModalOpen(false);
    setNewFolderNameInput("");
    toast.success(`Dossier « ${raw}/ » créé !`);
  }

  // Add new file
  function handleConfirmNewFile() {
    let raw = newFilePathInput.trim();
    if (!raw) {
      toast.error("Veuillez renseigner un nom de fichier.");
      return;
    }
    if (targetFolderForNewFile && !raw.includes("/")) {
      raw = `${targetFolderForNewFile}/${raw}`;
    }
    const path = raw.startsWith("/") ? raw.slice(1) : raw;
    const name = path.split("/").pop() || path;
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const language =
      ext === "ts" || ext === "tsx"
        ? "typescript"
        : ext === "js" || ext === "jsx"
        ? "javascript"
        : ext === "sql"
        ? "sql"
        : ext === "json"
        ? "json"
        : ext === "css"
        ? "css"
        : "markdown";

    // Auto register parent folder if present
    if (path.includes("/")) {
      const folder = path.slice(0, path.lastIndexOf("/"));
      if (!customFolders.includes(folder)) {
        setCustomFolders((prev) => [...prev, folder]);
        setOpenFolders((prev) => ({ ...prev, [folder]: true }));
      }
    }

    setVirtualFiles((prev) => ({
      ...prev,
      [path]: {
        path,
        name,
        language,
        category: ext === "ts" || ext === "tsx" || ext === "js" ? "code" : ext === "sql" ? "config" : "spec",
        content: `# Fichier : ${name}\n\n// Début du code ou de la spécification\n`,
      },
    }));

    handleFileSelect(path);
    setIsNewFileModalOpen(false);
    setNewFilePathInput("");
    setTargetFolderForNewFile("");
    toast.success(`Fichier « ${name} » créé !`);
  }

  // Delete individual file
  function handleDeleteFile(pathToDelete: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = { ...virtualFiles };
    delete updated[pathToDelete];
    setVirtualFiles(updated);
    if (activeFilePath === pathToDelete) {
      const remaining = Object.keys(updated);
      setActiveFilePath(remaining[0] || "");
    }
    toast.success(`Fichier « ${pathToDelete} » supprimé.`);
  }

  // Delete folder and its contents
  function handleDeleteFolder(folderName: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = { ...virtualFiles };
    Object.keys(updated).forEach((p) => {
      if (p.startsWith(`${folderName}/`)) {
        delete updated[p];
      }
    });
    setVirtualFiles(updated);
    setCustomFolders((prev) => prev.filter((f) => f !== folderName));
    toast.success(`Dossier « ${folderName}/ » supprimé.`);
  }

  // Send message to Architect AI
  async function handleSendMessage(customPrompt?: string, attachmentInfo?: string) {
    const text = (customPrompt || "").trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      attachmentName: attachmentInfo,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const activeSpec = virtualFiles["specs/cahier-des-charges.md"]?.content || "";
      const res = await askBuildingArchitect({
        data: {
          userMessage: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          currentProject: {
            projectName,
            currentSpec: activeSpec,
            currentFiles: virtualFiles,
          },
          model: selectedModel,
        },
      });

      if (res.projectName && res.projectName !== projectName) {
        setProjectName(res.projectName);
      }

      if (res.virtualFiles) {
        setVirtualFiles((prev) => ({
          ...prev,
          ...res.virtualFiles,
        }));
      }

      if (res.recommendedSkills && res.recommendedSkills.length > 0) {
        setRecommendedSkills(res.recommendedSkills);
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply || "Cahier des charges mis à jour avec succès.",
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        thinkingRows: [
          { primary: "Lecture et cadrage de la demande" },
          { primary: "Découpage multi-niveaux : MVP, V1 et V2" },
          { primary: `Affectation de ${res.recommendedSkills?.length || 7} skills AIFAC` },
          { primary: "Mise à jour des fichiers et du cahier des charges" },
        ],
      };
      setMessages((prev) => [...prev, botMsg]);
      toast.success("Cahier des charges et architecture mis à jour !");
    } catch {
      toast.error("Erreur de connexion avec l'Architecte IA.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSendFromInput({
    message,
    files,
    pastedContent,
    model,
  }: {
    message: string;
    files: AttachedFile[];
    pastedContent: AttachedFile[];
    model: string;
    isThinkingEnabled: boolean;
  }) {
    setSelectedModel(model);
    let fullPrompt = message;
    let attachmentLabel: string | undefined;

    const allAttachments = [...files, ...pastedContent];
    if (allAttachments.length > 0) {
      const first = allAttachments[0];
      attachmentLabel = first?.file?.name || "Extrait joint";
      if (first?.content) {
        fullPrompt = `[DOCUMENT / CODE JOINT : ${attachmentLabel}]\n${first.content}\n\nDemande : ${message}`;
      }
    }
    handleSendMessage(fullPrompt, attachmentLabel);
  }

  function handleDownloadSpec() {
    const spec = virtualFiles["specs/cahier-des-charges.md"]?.content || virtualFiles[activeFilePath]?.content || "";
    const blob = new Blob([spec], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(projectName || "projet").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cahier-des-charges.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Cahier des charges téléchargé !");
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copié !`);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleFileSelect(path: string) {
    setActiveFilePath(path);
    setMobileTab("editor");
  }

  function clearHistory() {
    setMessages([
      {
        id: `m-${Date.now()}`,
        role: "assistant",
        content: `Nouveau fil de discussion ouvert pour **${projectName}**. Décrivez vos objectifs ou demandez des conseils d'architecture.`,
        timestamp: "Maintenant",
      },
    ]);
    toast.info("Nouvelle conversation démarrée.");
  }

  const activeFile = virtualFiles[activeFilePath] || virtualFiles[Object.keys(virtualFiles)[0] || ""] || {
    path: "README.md",
    name: "README.md",
    language: "markdown",
    content: "# " + projectName,
    category: "spec",
  };

  // Build dynamic folder tree
  const filteredFilePaths = useMemo(() => {
    return Object.keys(virtualFiles).filter((p) =>
      p.toLowerCase().includes(searchFileQuery.toLowerCase())
    );
  }, [virtualFiles, searchFileQuery]);

  const allFolders = useMemo(() => {
    const set = new Set<string>(customFolders);
    Object.keys(virtualFiles).forEach((p) => {
      if (p.includes("/")) {
        const folder = p.slice(0, p.lastIndexOf("/"));
        set.add(folder);
      }
    });
    return Array.from(set).sort();
  }, [customFolders, virtualFiles]);

  const rootFiles = useMemo(() => {
    return filteredFilePaths.filter((p) => !p.includes("/"));
  }, [filteredFilePaths]);

  const isSkillFile = activeFilePath.startsWith("skills-recommandes/");
  const currentSkillId = isSkillFile
    ? activeFilePath.replace("skills-recommandes/", "").replace(".md", "")
    : null;

  return (
    <div className="flex h-[calc(100vh-56px)] w-full flex-col overflow-hidden bg-paper text-ink selection:bg-accent/20">
      {/* 1. TOP HEADER (COMPACT & RESPONSIVE) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-card/90 px-3 sm:px-4 backdrop-blur-md z-20 gap-2">
        {/* Left: Project Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-xs font-bold text-ink hover:border-accent/40 transition-colors max-w-[140px] sm:max-w-xs"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent text-[11px]">
                📁
              </span>
              <span className="truncate">{projectName}</span>
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-2xl border border-line bg-card p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Projets récents
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchProject(p.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left transition-colors ${
                        p.id === activeProjectId
                          ? "bg-accent/15 font-bold text-accent"
                          : "text-ink hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.id === activeProjectId && <Check size={12} className="text-accent shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-line/60 mt-1.5 pt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      setIsNewProjectModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Nouveau projet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: VS Code Style Panel Toggles (Desktop only) */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-line bg-paper/60 p-1">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              showExplorer ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-ink"
            }`}
            title="Basculer l'Explorateur (arborescence)"
          >
            <PanelLeft size={14} />
            <span>Arborescence</span>
          </button>

          <button
            onClick={() => setShowChatPanel(!showChatPanel)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              showChatPanel ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-ink"
            }`}
            title="Basculer l'Architecte IA"
          >
            <Bot size={14} />
            <span>Architecte</span>
          </button>

          <button
            onClick={() => setShowDocPanel(!showDocPanel)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              showDocPanel ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-ink"
            }`}
            title="Basculer l'Éditeur (Cahier & Code)"
          >
            <PanelRight size={14} />
            <span>Éditeur & Code</span>
          </button>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleDownloadSpec}
            className="btn-base btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-bold"
            title="Télécharger le Cahier des Charges en .md"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Télécharger .md</span>
          </button>

          <button
            onClick={() =>
              handleCopy(
                virtualFiles[".cursor/rules"]?.content ||
                  virtualFiles["specs/cahier-des-charges.md"]?.content ||
                  "",
                "Directives Agents"
              )
            }
            className="btn-base btn-ghost text-xs px-2.5 py-1.5 hidden md:inline-flex items-center gap-1"
            title="Copier les directives pour Cursor / Windsurf (.cursorrules)"
          >
            {copiedField === "Directives Agents" ? (
              <Check size={13} className="text-emerald-500" />
            ) : (
              <Copy size={13} />
            )}
            <span>.cursorrules</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="btn-base btn-ghost text-xs p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Supprimer ce projet"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* MOBILE / NARROW SCREEN TAB SWITCHER (Visible < 1024px) */}
      <div className="flex lg:hidden shrink-0 border-b border-line bg-card px-2 py-1 gap-1">
        <button
          onClick={() => setMobileTab("tree")}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === "tree" ? "bg-accent text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Folder size={13} />
          <span>Fichiers ({Object.keys(virtualFiles).length})</span>
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === "chat" ? "bg-accent text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Bot size={13} />
          <span>Architecte IA</span>
        </button>
        <button
          onClick={() => setMobileTab("editor")}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === "editor" ? "bg-accent text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileCode size={13} />
          <span>Code & Doc</span>
        </button>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* --- LEFT EXPLORER SIDEBAR --- */}
        <aside
          className={`${
            showExplorer ? (mobileTab === "tree" ? "flex w-full" : "hidden lg:flex") : "hidden"
          } w-full lg:w-64 xl:w-72 shrink-0 flex-col border-r border-line bg-card/60`}
        >
          {/* Tree Header with Add File / Folder Buttons */}
          <div className="flex h-11 items-center justify-between border-b border-line px-3 bg-card">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Explorateur
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setTargetFolderForNewFile("");
                  setIsNewFileModalOpen(true);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
                title="Nouveau fichier"
              >
                <FilePlus size={14} />
              </button>
              <button
                onClick={() => setIsNewFolderModalOpen(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
                title="Nouveau dossier"
              >
                <FolderPlus size={14} />
              </button>
              <button
                onClick={() => setShowExplorer(false)}
                className="hidden lg:flex p-1 rounded-md text-muted-foreground hover:text-ink hover:bg-muted transition-colors ml-0.5"
                title="Fermer l'explorateur (VS Code)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="p-2 border-b border-line/60">
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2 py-1 text-xs">
              <Search size={12} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Filtrer l'arborescence..."
                value={searchFileQuery}
                onChange={(e) => setSearchFileQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] text-ink placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Tree List */}
          <div className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-1.5">
            {/* Custom & Dynamic Folders */}
            {allFolders.map((folder) => {
              const isOpen = openFolders[folder] !== false;
              const filesInFolder = filteredFilePaths.filter((p) => p.startsWith(`${folder}/`));

              return (
                <div key={folder} className="space-y-0.5">
                  <div className="group flex items-center justify-between rounded-lg px-2 py-1 text-xs font-bold text-ink hover:bg-muted/70 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder)}
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                    >
                      {isOpen ? (
                        <FolderOpen size={14} className="text-accent shrink-0" />
                      ) : (
                        <Folder size={14} className="text-accent/80 shrink-0" />
                      )}
                      <span className="truncate">{folder}/</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                        {filesInFolder.length}
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetFolderForNewFile(folder);
                          setIsNewFileModalOpen(true);
                        }}
                        className="p-1 text-muted-foreground hover:text-accent rounded"
                        title={`Ajouter un fichier dans ${folder}/`}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(folder, e)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                        title={`Supprimer le dossier ${folder}/`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="ml-3 pl-2 border-l border-line/70 space-y-0.5">
                      {filesInFolder.length === 0 ? (
                        <div className="py-1 px-2 text-[10px] text-muted-foreground italic">
                          Dossier vide
                        </div>
                      ) : (
                        filesInFolder.map((path) => {
                          const f = virtualFiles[path];
                          if (!f) return null;
                          const isActive = activeFilePath === path;
                          return (
                            <div
                              key={path}
                              onClick={() => handleFileSelect(path)}
                              className={`group/item flex items-center justify-between rounded-lg px-2 py-1 cursor-pointer transition-colors text-[11px] ${
                                isActive
                                  ? "bg-accent/15 font-bold text-accent border border-accent/30"
                                  : "text-muted-foreground hover:bg-muted hover:text-ink"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCode size={12} className={isActive ? "text-accent" : "text-muted-foreground"} />
                                <span className="truncate">{f.name}</span>
                              </div>
                              <button
                                onClick={(e) => handleDeleteFile(path, e)}
                                className="opacity-0 group-hover/item:opacity-100 p-0.5 text-muted-foreground hover:text-destructive rounded transition-opacity"
                                title="Supprimer ce fichier"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Root Files */}
            {rootFiles.map((path) => {
              const f = virtualFiles[path];
              if (!f) return null;
              const isActive = activeFilePath === path;
              return (
                <div
                  key={path}
                  onClick={() => handleFileSelect(path)}
                  className={`group/root flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer transition-colors text-[11px] ${
                    isActive
                      ? "bg-accent/15 font-bold text-accent border border-accent/30"
                      : "text-muted-foreground hover:bg-muted hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText size={13} className={isActive ? "text-accent" : "text-amber-500"} />
                    <span className="truncate font-medium">{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFile(path, e)}
                    className="opacity-0 group-hover/root:opacity-100 p-0.5 text-muted-foreground hover:text-destructive rounded transition-opacity"
                    title="Supprimer ce fichier"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Skills Info */}
          <div className="p-3 border-t border-line bg-card flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Skills du projet :</span>
              <span className="font-bold text-accent">{recommendedSkills.length} skills</span>
            </div>
            <Link
              to="/app/ressources"
              className="btn-base btn-ghost text-xs w-full py-1 text-center flex items-center justify-center gap-1.5"
            >
              <Cpu size={12} />
              <span>Consulter les 219 skills</span>
            </Link>
          </div>
        </aside>

        {/* --- CENTER AGENT CHAT (MATCHING COACH INTERFACE) --- */}
        <div
          className={`${
            showChatPanel ? (mobileTab === "chat" ? "flex w-full" : "hidden lg:flex") : "hidden"
          } flex-1 min-w-0 flex-col h-full overflow-hidden bg-paper`}
        >
          {/* Chat Header */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-card/60 px-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-ink">Lead Architecte IA</span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                {CHAT_MODELS.find((m) => m.id === selectedModel)?.name || "GPT-OSS 120B"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Démarrer un nouveau fil de discussion"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Nouveau fil</span>
              </button>
              <button
                onClick={() => setShowChatPanel(false)}
                className="hidden lg:flex p-1 rounded-md text-muted-foreground hover:text-ink hover:bg-muted transition-colors ml-0.5"
                title="Fermer le panneau Architecte (VS Code)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.length <= 1 && (
                <div className="text-center py-6 space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
                    <LogoMark size={28} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-ink">
                    Studio Architecte & Cadrage AIFAC
                  </h2>
                  <p className="max-w-lg mx-auto text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Concevez, cadrez et structurez votre projet avec le Lead Architecte d'AI Factory.
                    Le découpage MVP/V1/V2 et les skills adaptés s'injectent directement dans vos fichiers.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-left">
                    {PRESET_IDEAS.map((idea) => (
                      <button
                        key={idea.title}
                        onClick={() =>
                          handleSendMessage(
                            `Je veux créer le projet nommé "${idea.title}". Description : ${idea.desc}. Peux-tu structurer le cahier des charges complet, le découpage MVP/V1/V2, et les skills AIFAC indispensables ?`
                          )
                        }
                        className="rounded-xl border border-line bg-card p-3 text-left hover:border-accent/40 hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-xs font-bold text-ink">{idea.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{idea.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-xs mt-0.5">
                      <LogoMark size={18} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-2xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent text-white font-medium shadow-xs rounded-br-xs"
                        : "border border-line bg-card text-ink shadow-xs rounded-bl-xs"
                    }`}
                  >
                    {m.attachmentName && (
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-0.5 text-[11px] font-mono">
                        <FileCode size={11} /> {m.attachmentName}
                      </div>
                    )}

                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-xs sm:text-sm dark:prose-invert">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}

                    <div
                      className={`mt-1.5 text-[10px] ${
                        m.role === "user" ? "text-white/70 text-right" : "text-muted-foreground"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start max-w-2xl">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-xs">
                    <LogoMark size={18} />
                  </div>
                  <div className="w-full rounded-2xl border border-line bg-card p-4 shadow-xs">
                    <ThinkingState
                      variant="Steps"
                      status="working"
                      active="Raisonnement d'architecture en cours..."
                      done="Architecture validée"
                      rows={[
                        { primary: "Analyse des besoins et de la vision du projet" },
                        { primary: "Découpage multi-niveaux : Scope MVP, V1 et V2" },
                        { primary: "Sélection des 219 skills AIFAC adaptés" },
                        { primary: "Génération et mise à jour des spécifications techniques" },
                      ]}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="border-t border-line/60 bg-paper/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSendMessage("Peux-tu affiner le découpage du MVP pour la semaine 1 ?")}
              className="rounded-full border border-line bg-card px-3 py-1 text-muted-foreground hover:text-accent hover:border-accent/40 whitespace-nowrap transition-colors"
            >
              ⚡ Affiner le MVP
            </button>
            <button
              onClick={() => handleSendMessage("Quels sont les skills AIFAC indispensables pour ce projet ?")}
              className="rounded-full border border-line bg-card px-3 py-1 text-muted-foreground hover:text-accent hover:border-accent/40 whitespace-nowrap transition-colors"
            >
              🧩 Recommander les Skills
            </button>
            <button
              onClick={() => handleSendMessage("Génère l'arborescence complète et le schéma SQL Supabase.")}
              className="rounded-full border border-line bg-card px-3 py-1 text-muted-foreground hover:text-accent hover:border-accent/40 whitespace-nowrap transition-colors"
            >
              🧱 Architecture & Schéma SQL
            </button>
          </div>

          {/* Bottom Chat Input (Matching Coach) */}
          <div className="border-t border-line bg-card/60 p-3 sm:p-4">
            <div className="max-w-3xl mx-auto">
              <ClaudeChatInput
                onSendMessage={handleSendFromInput}
                placeholder="Décrivez votre idée de projet, une fonctionnalité, ou posez une question à l'Architecte..."
                models={CHAT_MODELS}
                defaultModel={selectedModel}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* --- RIGHT DOCUMENT & CODE EDITOR (VS CODE STYLE) --- */}
        <div
          className={`${
            showDocPanel ? (mobileTab === "editor" ? "flex w-full" : "hidden lg:flex") : "hidden"
          } ${
            !showChatPanel ? "flex-1" : "w-full lg:w-[45%] xl:w-[42%]"
          } shrink-0 flex-col h-full min-h-0 overflow-hidden border-l border-line bg-paper`}
        >
          {/* Editor Header */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-card/60 px-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-accent shrink-0" />
              <span className="font-mono text-xs font-bold text-ink truncate">
                {activeFile.name}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                ({activeFile.language})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isSkillFile && currentSkillId && (
                <Link
                  to="/app/ressources/skills/$skillSlug"
                  params={{ skillSlug: currentSkillId }}
                  className="btn-base bg-accent/15 text-accent border border-accent/30 text-xs py-1 px-2 flex items-center gap-1 font-bold hover:bg-accent hover:text-white transition-all shrink-0"
                >
                  <ExternalLink size={12} />
                  <span className="hidden sm:inline">Fiche skill</span>
                </Link>
              )}

              {activeFilePath.endsWith(".md") && (
                <div className="flex items-center rounded-lg border border-line bg-paper p-0.5 text-xs">
                  <button
                    onClick={() => setDocViewMode("preview")}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-bold transition-all ${
                      docViewMode === "preview"
                        ? "bg-accent text-white"
                        : "text-muted-foreground hover:text-ink"
                    }`}
                  >
                    <Eye size={11} />
                    <span>Aperçu</span>
                  </button>
                  <button
                    onClick={() => setDocViewMode("code")}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-bold transition-all ${
                      docViewMode === "code"
                        ? "bg-accent text-white"
                        : "text-muted-foreground hover:text-ink"
                    }`}
                  >
                    <Code2 size={11} />
                    <span>Code</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => handleCopy(activeFile.content, activeFile.name)}
                className="btn-base btn-ghost text-xs py-1 px-2"
                title="Copier le contenu"
              >
                {copiedField === activeFile.name ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
                <span>Copier</span>
              </button>

              <button
                onClick={handleDownloadSpec}
                className="btn-base btn-glow text-xs py-1 px-2 flex items-center gap-1 font-bold"
              >
                <Download size={12} />
                <span>Télécharger</span>
              </button>

              <button
                onClick={() => setShowDocPanel(false)}
                className="hidden lg:flex p-1 rounded-md text-muted-foreground hover:text-ink hover:bg-muted transition-colors ml-0.5"
                title="Fermer l'éditeur (VS Code)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper">
            {activeFilePath.endsWith(".md") && docViewMode === "preview" ? (
              <div className="prose prose-sm max-w-none text-xs sm:text-sm dark:prose-invert">
                <Markdown>{activeFile.content}</Markdown>
              </div>
            ) : (
              <div className="relative font-mono text-xs leading-relaxed bg-[#0d1117] text-white p-4 rounded-xl border border-line/60 overflow-x-auto min-h-full">
                <textarea
                  value={activeFile.content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setVirtualFiles((prev) => ({
                      ...prev,
                      [activeFilePath]: {
                        ...activeFile,
                        content: newContent,
                      },
                    }));
                  }}
                  className="w-full min-h-[300px] h-full bg-transparent text-white font-mono text-xs focus:outline-none resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {/* All panels hidden fallback */}
        {!showExplorer && !showChatPanel && !showDocPanel && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-paper">
            <Boxes className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-bold text-ink">Tous les panneaux sont masqués</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Utilisez les boutons de la barre supérieure pour afficher l'Arborescence, l'Architecte ou l'Éditeur.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <button onClick={() => setShowExplorer(true)} className="btn-base btn-ghost text-xs">Ouvrir Arborescence</button>
              <button onClick={() => setShowChatPanel(true)} className="btn-base btn-primary text-xs">Ouvrir Architecte</button>
              <button onClick={() => setShowDocPanel(true)} className="btn-base btn-ghost text-xs">Ouvrir Éditeur</button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {/* 1. Modal: Nouveau Fichier */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <FilePlus size={16} className="text-accent" />
                Créer un nouveau fichier
              </h3>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-muted-foreground hover:text-ink p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {targetFolderForNewFile
                ? `Le fichier sera créé dans le dossier "${targetFolderForNewFile}/".`
                : "Indiquez le nom ou chemin relatif du fichier (ex: src/components/Button.tsx)."}
            </p>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Nom du fichier
              </label>
              <input
                type="text"
                value={newFilePathInput}
                onChange={(e) => setNewFilePathInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmNewFile()}
                placeholder="Ex: main.ts, auth.service.ts, schema.sql..."
                autoFocus
                className="field text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className="btn-base btn-ghost text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmNewFile}
                disabled={!newFilePathInput.trim()}
                className="btn-base btn-glow text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus size={14} /> Créer le fichier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Nouveau Dossier */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <FolderPlus size={16} className="text-accent" />
                Créer un nouveau dossier
              </h3>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-muted-foreground hover:text-ink p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Nommez votre dossier pour organiser votre architecture (ex: <code>src</code>, <code>components</code>, <code>api</code>, <code>docs</code>).
            </p>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Nom du dossier
              </label>
              <input
                type="text"
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmNewFolder()}
                placeholder="Ex: src, backend, models, docs..."
                autoFocus
                className="field text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="btn-base btn-ghost text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmNewFolder}
                disabled={!newFolderNameInput.trim()}
                className="btn-base btn-glow text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus size={14} /> Créer le dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Nouveau Projet */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <Laptop size={18} className="text-accent" />
                Créer un nouveau projet
              </h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-muted-foreground hover:text-ink p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Chaque projet démarre avec une architecture propre. Vous créez vos propres dossiers et fichiers dans le studio.
            </p>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Nom du projet
              </label>
              <input
                type="text"
                value={newProjectNameInput}
                onChange={(e) => setNewProjectNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNewProject()}
                placeholder="Ex: SaaS CRM Immobilier, Marketplace B2B..."
                autoFocus
                className="field text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="btn-base btn-ghost text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateNewProject}
                disabled={!newProjectNameInput.trim()}
                className="btn-base btn-glow text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus size={14} /> Créer le projet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Confirmation Suppression Projet */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 size={20} />
              <h3 className="font-bold text-ink text-sm">Supprimer le projet ?</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le projet <strong className="text-ink">« {projectName} »</strong> ? 
              Tous les fichiers virtuels, la spécification et l'historique du chat seront retirés.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn-base btn-ghost text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentProject}
                className="btn-base bg-destructive text-white hover:brightness-110 text-xs flex items-center gap-1.5 font-bold"
              >
                <Trash2 size={13} /> Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
