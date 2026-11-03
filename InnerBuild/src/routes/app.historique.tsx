import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "@/components/ui/heroui-toast";
import { deleteCoachHistory } from "@/lib/tutor.functions";
import { Search, Trash2, FileText, ArrowRight, Copy, Check, MessageSquare, Clock, ExternalLink } from "lucide-react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { Markdown } from "@/components/app/AiChat";
import { d1ListServerFn } from "@/lib/d1-data.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/historique")({
  head: appHead("Historique du coach", "Retrouve, recherche et consulte les discussions avec le Coach AIFAC."),
  component: HistoriquePage,
});

const sourceLabel: Record<string, { label: string; color: string }> = {
  lesson: { label: "Leçon", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  explain: { label: "Expliquer", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  next: { label: "Prochaines étapes", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  feedback: { label: "Revue", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  coach: { label: "Coach", color: "bg-accent/10 text-accent border-accent/20" },
  analyze: { label: "Analyse", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
};

type Row = {
  id: string;
  source: string;
  lesson_id: string;
  lesson_title: string;
  question: string;
  answer: string;
  created_at: string;
};

/** Extracts clean user question and attached document metadata from technical prompt injections */
function parseQuestion(raw: string, fallbackTitle?: string): { text: string; docName: string | null } {
  if (!raw) return { text: "Question sans texte", docName: fallbackTitle || null };
  if (raw.includes("[DOCUMENT JOINT ANALYSÉ :")) {
    const docMatch = raw.match(/\[DOCUMENT JOINT ANALYSÉ : ([^|]+) \|/);
    const docName = docMatch ? docMatch[1]?.trim() : fallbackTitle || "Document joint";
    const reqMatch = raw.match(/Demande de l'apprenant : ([\s\S]+)$/);
    const text = (reqMatch && reqMatch[1]) ? reqMatch[1].trim() : `Analyse du document : ${docName}`;
    return { text, docName: docName || null };
  }
  return { text: raw, docName: fallbackTitle || null };
}

function HistoriquePage() {
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteCoachHistory);
  const [search, setSearch] = useState("");
  const [src, setSrc] = useState("all");
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; title?: string | undefined } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["coach-history"],
    queryFn: async () => {
      const { getD1SessionUser } = await import("@/lib/d1-session");
      const session = getD1SessionUser();
      if (!session) return [];
      const isMasterAdmin = session.email?.toLowerCase() === "eltonhounnou27@gmail.com";

      let res;
      if (isMasterAdmin) {
        res = await d1ListServerFn({
          data: { table: "coach_questions", orderBy: "created_at", orderDir: "DESC", limit: 500 },
        });
      } else {
        res = await d1ListServerFn({
          data: {
            table: "coach_questions",
            where: { user_id: session.id },
            orderBy: "created_at",
            orderDir: "DESC",
            limit: 500,
          },
        });
      }

      if (!res.success) throw new Error(res.error || "D1");
      return (res.rows || []) as Row[];
    },
  });

  const s = search.trim().toLowerCase();
  const rows = data
    .filter(
      (r) =>
        r.source !== "train" &&
        !r.question.startsWith("Génère 1 question") &&
        !r.question.includes("Format JSON strict")
    )
    .filter(
      (r) =>
        (src === "all" || r.source === src) &&
        (!s || `${r.question} ${r.answer} ${r.lesson_title}`.toLowerCase().includes(s))
    );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["coach-history"] });
    await qc.invalidateQueries({ queryKey: ["coach-chat-history"] });
  };

  function del(ids: string[], title?: string) {
    if (!ids.length) return;
    setConfirmDelete({ ids, title });
  }

  async function executeDelete(ids: string[]) {
    if (!ids.length || isDeleting) return;
    setIsDeleting(true);
    // Optimistic cache update so rows vanish immediately
    qc.setQueryData(["coach-history"], (old: Row[] | undefined) => {
      if (!old) return [];
      return old.filter((r) => !ids.includes(r.id));
    });
    try {
      const res = await deleteFn({ data: { ids } });
      if (!res.success) {
        throw new Error(res.error || "Erreur de suppression");
      }
      toast.success(ids.length > 1 ? `${ids.length} discussions supprimées` : "Discussion supprimée");
      if (selectedRow && ids.includes(selectedRow.id)) {
        setSelectedRow(null);
      }
      setConfirmDelete(null);
      await refresh();
    } catch (err: any) {
      console.error("Delete failed", err);
      toast.danger("Erreur lors de la suppression : " + (err.message || "Erreur réseau"));
      await refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Réponse copiée dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  }

  const sources = Array.from(new Set(data.map((r) => r.source)));

  return (
    <>
      <PageHeader
        eyebrow="Formations · Coach AIFAC"
        title="Mon historique de discussions"
        subtitle="Retrouve toutes les discussions et analyses traitées par le coach IA."
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="field flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par mot-clé, document ou réponse…"
            className="w-full bg-transparent outline-none text-xs sm:text-sm"
          />
        </label>
        <select
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          className="field sm:w-48 text-xs sm:text-sm"
          aria-label="Filtrer par origine"
        >
          <option value="all">Tous les types ({data.length})</option>
          {sources.map((x) => (
            <option key={x} value={x}>
              {sourceLabel[x]?.label ?? x}
            </option>
          ))}
        </select>
        {rows.length > 0 && (
          <button
            onClick={() => del(rows.map((r) => r.id))}
            className="btn-base btn-ghost text-xs text-destructive hover:bg-destructive/10 w-full sm:w-auto justify-center"
          >
            {s || src !== "all" ? `Supprimer ces ${rows.length}` : "Tout effacer"}
          </button>
        )}
      </div>

      {/* Queue View ("Fils d'attente") */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card border border-line" />
          ))}
        </div>
      ) : !data.length ? (
        <Empty
          title="Aucune discussion pour l'instant"
          text="Pose une question depuis une leçon ou l'Assistant IA pour commencer votre fil d'apprentissage."
        />
      ) : !rows.length ? (
        <Empty title="Aucun résultat" text="Essaie un autre mot-clé ou réinitialise les filtres." />
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, index) => {
            const { text: cleanQ, docName } = parseQuestion(r.question, r.lesson_title);
            const sourceMeta = sourceLabel[r.source] || { label: r.source, color: "bg-muted text-muted-foreground" };
            const queueNumber = rows.length - index;

            return (
              <div
                key={r.id}
                onClick={() => setSelectedRow(r)}
                className="group relative flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-line bg-card hover:border-accent/40 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                {/* Left: Queue index & Main content */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  {/* Queue Badge */}
                  <span className="shrink-0 flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-paper border border-line text-xs font-mono font-bold text-muted-foreground group-hover:border-accent/40 group-hover:text-accent transition-colors">
                    #{queueNumber}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Meta bar: Origin + Document + Date */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sourceMeta.color}`}>
                        {sourceMeta.label}
                      </span>

                      {docName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[160px]">{docName}</span>
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3" />
                        {new Date(r.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="mt-1.5 font-bold text-ink text-sm sm:text-[15px] truncate group-hover:text-accent transition-colors">
                      {cleanQ}
                    </p>

                    {/* Answer excerpt snippet */}
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {r.answer.replace(/[*#`_]/g, "").slice(0, 160)}…
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    Voir la réponse <ArrowRight className="w-3.5 h-3.5" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      del([r.id], parseQuestion(r.question, r.lesson_title).text.slice(0, 45));
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Supprimer cette discussion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for Thread Details */}
      {selectedRow && (
        <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-line shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-line bg-paper/50">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    sourceLabel[selectedRow.source]?.color || "bg-muted text-muted-foreground"
                  }`}
                >
                  {sourceLabel[selectedRow.source]?.label || selectedRow.source}
                </span>

                {parseQuestion(selectedRow.question, selectedRow.lesson_title).docName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
                    <FileText className="w-3 h-3" />
                    {parseQuestion(selectedRow.question, selectedRow.lesson_title).docName}
                  </span>
                )}

                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(selectedRow.created_at).toLocaleString("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <DialogTitle className="text-lg sm:text-xl font-extrabold text-ink tracking-tight">
                {parseQuestion(selectedRow.question, selectedRow.lesson_title).text}
              </DialogTitle>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Question bubble */}
              <div className="p-4 rounded-xl bg-paper border border-line">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Ta demande :</p>
                <p className="text-sm font-medium text-ink whitespace-pre-wrap">
                  {parseQuestion(selectedRow.question, selectedRow.lesson_title).text}
                </p>
              </div>

              {/* Response */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-line shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-line pb-2">
                  <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Réponse du Coach AIFAC
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopy(selectedRow.answer)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink transition-colors px-2 py-1 rounded hover:bg-muted"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copié" : "Copier"}</span>
                  </button>
                </div>

                <div className="text-sm">
                  <Markdown>{selectedRow.answer}</Markdown>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-line bg-paper/50 flex flex-wrap items-center justify-between gap-3">
              {selectedRow.lesson_id ? (
                <Link
                  to="/app/apprendre"
                  search={{ lecon: selectedRow.lesson_id }}
                  className="btn-base btn-ghost text-xs text-accent gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Revoir la leçon liée
                </Link>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    del(
                      [selectedRow.id],
                      parseQuestion(selectedRow.question, selectedRow.lesson_title).text.slice(0, 45)
                    )
                  }
                  className="btn-base btn-ghost text-xs text-destructive hover:bg-destructive/10"
                >
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="btn-base btn-primary text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal for deletion */}
      {confirmDelete && (
        <Dialog open={true} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <DialogContent className="max-w-md p-6 bg-card border-line shadow-xl rounded-2xl">
            <DialogHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <Trash2 className="h-6 w-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-ink">
                {confirmDelete.ids.length > 1
                  ? `Supprimer ${confirmDelete.ids.length} discussions ?`
                  : `Supprimer cette discussion ?`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {confirmDelete.title ? `"${confirmDelete.title}"` : "Cette action"} sera retirée
                définitivement de votre historique de coach IA. Cette opération est irréversible.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={isDeleting}
                className="btn-base btn-ghost text-xs px-4 py-2"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => executeDelete(confirmDelete.ids)}
                disabled={isDeleting}
                className="btn-base bg-destructive text-white hover:bg-destructive/90 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                {isDeleting ? "Suppression en cours..." : "Confirmer la suppression"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
