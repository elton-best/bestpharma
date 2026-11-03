import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCode,
  Github,
  Key,
  Layers,
  Loader2,
  Mail,
  Copy,
  Check,
  BarChart2,
  Send,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "@/components/ui/heroui-toast";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { MarkdownToolbar } from "@/components/ui/markdown-toolbar";
import { Markdown } from "@/components/app/AiChat";
import {
  useChallenges,
  useChallengeActions,
  useChallengeRegistrations,
  useChallengeSubmissions,
  useChallengeEvaluations,
  useChallengeJury,
  useChallengeResults,
  type Challenge,
  type ChallengeSubmission,
  type ChallengeJury,
} from "@/lib/challenges";
import { d1DeleteServerFn, d1InsertServerFn, d1ListServerFn, d1UpdateServerFn } from "@/lib/d1-data.functions";
import { logAudit } from "@/lib/admin";

export const Route = createFileRoute("/admin/challenges")({
  head: appHead("Gestion des Challenges & Hackathons", "Création de challenges, gestion du jury, inscriptions et délibérations."),
  component: AdminChallengesPage,
});

type Tab = "challenges" | "nouveau" | "candidats" | "jury" | "soumissions" | "resultats" | "stats";

function AdminChallengesPage() {
  const [tab, setTab] = useState<Tab>("challenges");
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");

  const { data: challenges = [], isLoading } = useChallenges();
  const activeChallenges = challenges.filter((c) => c.status === "active");

  const effectiveChallengeId = selectedChallengeId || challenges[0]?.id || "";

  return (
    <>
      <PageHeader
        eyebrow="Hackathons & Recrutement"
        title="Centre de pilotage InnerBuild"
        subtitle="Crée des challenges intensifs, pilote les candidatures d'Inbuilders, coordonne le jury d'experts et proclame les résultats."
        action={
          tab !== "nouveau" ? (
            <button
              onClick={() => {
                setEditingChallenge(null);
                setTab("nouveau");
              }}
              className="btn-base btn-glow flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nouveau Challenge
            </button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Total Challenges" value={String(challenges.length)} />
        <Stat label="Challenges en cours" value={String(activeChallenges.length)} />
        <Stat label="Dotations en jeu" value={challenges[0]?.prize_pool || "500 000 F"} />
        <Stat label="Statut plateforme" value="InnerBuild Actif" />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-line pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: "challenges", label: "Tous les Challenges" },
          { id: "nouveau", label: editingChallenge ? "Modifier le Challenge" : "Créer un Challenge" },
          { id: "candidats", label: "Inscriptions & Candidats" },
          { id: "jury", label: "Membres du Jury" },
          { id: "soumissions", label: "Soumissions & Évaluations" },
          { id: "resultats", label: "Classement & Résultats" },
          { id: "stats", label: "Analytique & Graphiques" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
              tab === t.id
                ? "border-accent text-accent font-bold bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-ink hover:bg-muted/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content based on tab */}
      {tab === "challenges" && (
        <ChallengesListTab
          challenges={challenges}
          isLoading={isLoading}
          onEdit={(c) => {
            setEditingChallenge(c);
            setTab("nouveau");
          }}
        />
      )}

      {tab === "nouveau" && (
        <ChallengeFormTab
          initial={editingChallenge}
          onDone={() => {
            setEditingChallenge(null);
            setTab("challenges");
          }}
        />
      )}

      {tab === "candidats" && (
        <ChallengeRegistrationsTab
          challenges={challenges}
          selectedChallengeId={effectiveChallengeId}
          onSelectChallenge={setSelectedChallengeId}
        />
      )}

      {tab === "jury" && (
        <ChallengeJuryTab
          challenges={challenges}
          selectedChallengeId={effectiveChallengeId}
          onSelectChallenge={setSelectedChallengeId}
        />
      )}

      {tab === "soumissions" && (
        <ChallengeSubmissionsTab
          challenges={challenges}
          selectedChallengeId={effectiveChallengeId}
          onSelectChallenge={setSelectedChallengeId}
        />
      )}

      {tab === "resultats" && (
        <ChallengeResultsTab
          challenges={challenges}
          selectedChallengeId={effectiveChallengeId}
          onSelectChallenge={setSelectedChallengeId}
        />
      )}

      {tab === "stats" && (
        <ChallengeStatsTab
          challenges={challenges}
          selectedChallengeId={effectiveChallengeId}
          onSelectChallenge={setSelectedChallengeId}
        />
      )}
    </>
  );
}

/* ================= 1. TAB CHALLENGES LIST ================= */
function ChallengesListTab({
  challenges,
  isLoading,
  onEdit,
}: {
  challenges: Challenge[];
  isLoading: boolean;
  onEdit: (c: Challenge) => void;
}) {
  const { setChallengeStatus, deleteChallenge } = useChallengeActions();
  const [challengeToDelete, setChallengeToDelete] = useState<Challenge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return (
      <Panel>
        <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des challenges…
        </p>
      </Panel>
    );
  }

  if (!challenges.length) {
    return (
      <Panel>
        <Empty
          title="Aucun challenge créé"
          text="Clique sur « Nouveau Challenge » pour lancer le premier hackathon InnerBuild."
        />
      </Panel>
    );
  }

  const statusCls: Record<Challenge["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald/15 text-emerald font-bold",
    evaluation: "bg-blue-500/15 text-blue-500 font-bold",
    completed: "bg-accent/15 text-accent font-bold",
  };

  const statusName: Record<Challenge["status"], string> = {
    draft: "Brouillon",
    active: "En cours (Actif)",
    evaluation: "En délibération Jury",
    completed: "Terminé & Clôturé",
  };

  return (
    <Panel title={`Challenges enregistrés (${challenges.length})`}>
      <ul className="divide-y divide-line">
        {challenges.map((c) => (
          <li key={c.id} className="py-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusCls[c.status]}`}>
                  {statusName[c.status]}
                </span>
                <h3 className="font-bold text-ink text-base">{c.title}</h3>
                <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                  Dotation : {c.prize_pool}
                </span>
              </div>

              <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {c.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Durée : {c.duration_days} jours
                </span>
                {c.end_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Clôture : {new Date(c.end_date).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {c.status !== "active" && (
                <button
                  onClick={() => setChallengeStatus(c.id, c.title, "active")}
                  className="btn-base btn-glow text-xs flex items-center gap-1.5"
                >
                  <Rocket className="h-3.5 w-3.5" /> Activer & Diffuser
                </button>
              )}
              {c.status === "active" && (
                <button
                  onClick={() => setChallengeStatus(c.id, c.title, "evaluation")}
                  className="btn-base btn-ghost text-xs border border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                >
                  Passer en délibération
                </button>
              )}
              {c.status === "evaluation" && (
                <button
                  onClick={() => setChallengeStatus(c.id, c.title, "completed")}
                  className="btn-base btn-ghost text-xs border border-emerald/30 text-emerald hover:bg-emerald/10"
                >
                  Clôturer & Proclamer
                </button>
              )}
              <button onClick={() => onEdit(c)} className="btn-base btn-ghost text-xs">
                Modifier
              </button>
              <button
                onClick={() => setChallengeToDelete(c)}
                className="btn-base btn-ghost text-xs text-destructive hover:bg-destructive/10"
                title="Supprimer le challenge"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {challengeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-base">Supprimer définitivement le challenge ?</h3>
                <p className="text-xs text-muted-foreground">Action irréversible</p>
              </div>
            </div>
            <p className="text-sm text-ink/80 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le challenge « <strong className="text-ink font-semibold">{challengeToDelete.title}</strong> » ?
              <br /><br />
              Cette action effacera définitivement l'ensemble des inscriptions, livrables, jurys et évaluations associés.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setChallengeToDelete(null)}
                className="btn-base btn-ghost text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  const target = challengeToDelete;
                  await deleteChallenge(target);
                  setIsDeleting(false);
                  setChallengeToDelete(null);
                }}
                className="btn-base text-xs bg-destructive text-white hover:bg-destructive/90 font-bold flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isDeleting ? "Suppression en cours…" : "Supprimer définitivement"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ================= 2. TAB CHALLENGE FORM ================= */
function ChallengeFormTab({ initial, onDone }: { initial: Challenge | null; onDone: () => void }) {
  const { saveChallenge } = useChallengeActions();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [brief, setBrief] = useState(initial?.brief_content || "");
  const [prizePool, setPrizePool] = useState(initial?.prize_pool || "500 000 FCFA");
  const [durationDays, setDurationDays] = useState(initial?.duration_days || 7);
  const [status, setStatus] = useState<Challenge["status"]>(initial?.status || "active");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !brief.trim()) {
      toast.danger("Veuillez renseigner un titre et le brief officiel.");
      return;
    }
    setBusy(true);
    const ok = await saveChallenge(
      {
        title: title.trim(),
        description: description.trim(),
        brief_content: brief,
        prize_pool: prizePool,
        duration_days: Number(durationDays),
        status,
        end_date: new Date(Date.now() + Number(durationDays) * 864e5).toISOString(),
      },
      initial?.id
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <Panel title={initial ? `Modifier « ${initial.title} »` : "Nouveau Challenge / Hackathon InnerBuild"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Titre du Challenge *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex. Hackathon S02 : Application Multi-Agents IA"
              className="field text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Dotations & Prix</label>
            <input
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              placeholder="Ex. 500 000 FCFA + Accès incubation"
              className="field text-xs"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Durée (jours)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="field text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Statut initial</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="field text-xs"
            >
              <option value="active">En cours / Actif (diffusé aux apprenants)</option>
              <option value="draft">Brouillon (invisible)</option>
              <option value="evaluation">En délibération jury</option>
              <option value="completed">Terminé</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Accroche / Résumé</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="En 1 phrase : quel est le livrable attendu ?"
            className="field text-xs"
          />
        </div>

        {/* Markdown Brief Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground">Brief Officiel en Markdown *</label>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTab("edit")}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  tab === "edit" ? "bg-card text-ink shadow-xs" : "text-muted-foreground"
                }`}
              >
                Édition
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                  tab === "preview" ? "bg-card text-ink shadow-xs" : "text-muted-foreground"
                }`}
              >
                <Eye className="h-3 w-3" /> Prévisualisation
              </button>
            </div>
          </div>

          {tab === "edit" ? (
            <div className="space-y-2 border border-line rounded-xl p-2 bg-card">
              <MarkdownToolbar
                textareaId="admin-challenge-brief-editor"
                onInsert={(prefix, suffix, defaultText) => {
                  const area = document.getElementById("admin-challenge-brief-editor") as HTMLTextAreaElement | null;
                  if (!area) return;
                  const start = area.selectionStart;
                  const end = area.selectionEnd;
                  const sel = brief.substring(start, end) || defaultText || "texte";
                  const next = brief.substring(0, start) + prefix + sel + (suffix || "") + brief.substring(end);
                  setBrief(next);
                }}
              />
              <textarea
                id="admin-challenge-brief-editor"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={12}
                required
                placeholder="# Brief du Challenge..."
                className="w-full bg-paper p-3 font-mono text-xs text-ink rounded-lg border border-line focus:outline-none focus:border-accent"
              />
            </div>
          ) : (
            <div className="min-h-[250px] p-4 rounded-xl border border-line bg-paper text-sm">
              {brief ? <Markdown>{brief}</Markdown> : <p className="text-muted-foreground text-xs italic">Tapez du texte Markdown.</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button type="button" onClick={onDone} className="btn-base btn-ghost text-xs">
            Annuler
          </button>
          <button disabled={busy} className="btn-base btn-glow text-xs flex items-center gap-1.5">
            <Rocket className="h-3.5 w-3.5" /> {busy ? "Enregistrement…" : initial ? "Mettre à jour" : "Publier le Challenge"}
          </button>
        </div>
      </form>
    </Panel>
  );
}

/* ================= 3. TAB REGISTRATIONS / CANDIDATS ================= */
function ChallengeRegistrationsTab({
  challenges,
  selectedChallengeId,
  onSelectChallenge,
}: {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: registrations = [], isLoading } = useChallengeRegistrations(selectedChallengeId);

  async function updateStatus(regId: string, status: "accepted" | "rejected") {
    const res = await d1UpdateServerFn({
      data: { table: "challenge_registrations", id: regId, patch: { status, reviewed_at: new Date().toISOString() } },
    });

    if (!res.success) {
      toast.danger("Échec : " + (res.error || "D1"));
    } else {
      toast.success(status === "accepted" ? "Candidature acceptée !" : "Candidature rejetée");
      qc.invalidateQueries({ queryKey: ["challenge_registrations"] });
    }
  }

  return (
    <Panel title="Inscriptions & Candidats Inbuilders">
      <div className="mb-4">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Sélectionner le Challenge</label>
        <select
          value={selectedChallengeId}
          onChange={(e) => onSelectChallenge(e.target.value)}
          className="field text-xs sm:w-80"
        >
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : !registrations.length ? (
        <Empty title="Aucune inscription" text="Les apprenants qui s'inscrivent apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground uppercase border-b border-line">
              <tr>
                <th className="py-2.5">Date</th>
                <th>Apprenant</th>
                <th>Statut</th>
                <th>Motivation</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="font-bold text-ink">{r.user_id.slice(0, 8)}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${
                        r.status === "accepted"
                          ? "bg-emerald/15 text-emerald"
                          : r.status === "rejected"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground max-w-xs truncate">{r.motivation || "—"}</td>
                  <td className="text-right space-x-1 whitespace-nowrap">
                    {r.status !== "accepted" && (
                      <button
                        onClick={() => updateStatus(r.id, "accepted")}
                        className="btn-base btn-ghost text-[11px] text-emerald hover:bg-emerald/10"
                      >
                        Valider
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(r.id, "rejected")}
                        className="btn-base btn-ghost text-[11px] text-destructive hover:bg-destructive/10"
                      >
                        Refuser
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ================= 4. TAB JURY ================= */
function ChallengeJuryTab({
  challenges,
  selectedChallengeId,
  onSelectChallenge,
}: {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: juryMembers = [], isLoading } = useChallengeJury(selectedChallengeId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lead" | "expert" | "mentor">("expert");
  const [dimension, setDimension] = useState<string>("development");
  const [busy, setBusy] = useState(false);
  const [emailModalJury, setEmailModalJury] = useState<ChallengeJury | null>(null);

  const currentChallenge = challenges.find((c) => c.id === selectedChallengeId) || challenges[0];

  const JURY_DIMENSIONS_LIST = [
    { key: "development", label: "Développement & Architecture (/20)" },
    { key: "branding", label: "Branding & Identité visuelle (/20)" },
    { key: "seo_performance", label: "SEO & Performance Web (/20)" },
    { key: "communication", label: "Communication & Storytelling (/20)" },
    { key: "marketing", label: "Marketing & Conversion (/20)" },
    { key: "business", label: "Robustesse fonctionnelle & Business (/20)" },
    { key: "acquisition", label: "Acquisition client & Publicité (/20)" },
  ];

  function getJuryEmailContent(j: ChallengeJury) {
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/jury-login` : "https://ai-factory.eltonhounnou.me/jury-login";
    const challengeTitle = currentChallenge?.title || "Hackathon THE InnerBuild";
    const subject = `[THE InnerBuild] Vos accès Jury — ${challengeTitle}`;
    const dimLabel = JURY_DIMENSIONS_LIST.find((d) => d.key === (j as any).dimension)?.label || "Développement";
    const body = `Bonjour ${j.name},

Vous avez été désigné membre officiel du jury pour le Hackathon THE InnerBuild (${challengeTitle}).

Voici vos identifiants d'accès confidentiels :
• Rôle : ${j.role}
• Dimension d'évaluation attribuée : ${dimLabel}
• Code Jury personnel : ${j.code}
• Portail d'évaluation sécurisé : ${portalUrl}

Pour vous connecter et évaluer les projets des participants :
1. Rendez-vous sur ${portalUrl}
2. Saisissez votre code confidentiel : ${j.code}
3. Notez les critères d'évaluation de votre dimension sur /20 avec vos observations détaillées.

Merci pour votre précieuse contribution à la sélection et à l'excellence technique des Inbuilders !

L'équipe d'administration THE InnerBuild`;
    return { subject, body, portalUrl };
  }

  async function addJury(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);

    const code = "JURY-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    const res = await d1InsertServerFn({
      data: {
        table: "challenge_jury",
        row: {
          challenge_id: selectedChallengeId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          dimension,
          code,
        },
      },
    });

    setBusy(false);
    if (!res.success) {
      toast.danger("Échec : " + (res.error || "D1"));
    } else {
      const createdJury: ChallengeJury = {
        id: (res.id as string) || "jury-" + Date.now(),
        challenge_id: selectedChallengeId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        dimension,
        code,
        status: "active",
        created_at: new Date().toISOString(),
      };

      // Envoi automatique de l'email officiel d'invitation avec les accès
      try {
        const { sendJuryInvitationEmailServerFn } = await import("@/lib/challenges.functions");
        const mailRes = await sendJuryInvitationEmailServerFn({
          data: {
            email: email.trim().toLowerCase(),
            name: name.trim(),
            code,
            role,
            challengeTitle: currentChallenge?.title || "Hackathon THE InnerBuild",
          },
        });
        if (mailRes.success) {
          toast.success(`Jury ajouté et invitation transmise par email à ${email.trim()} !`);
        } else {
          toast.warning(`Jury enregistré (Code : ${code}), mais l'envoi de l'email a échoué : ${mailRes.error}`);
        }
      } catch (err: any) {
        toast.warning(`Jury enregistré, mais erreur d'envoi d'email : ${err.message || String(err)}`);
      }

      setName("");
      setEmail("");
      setEmailModalJury(createdJury);
      qc.invalidateQueries({ queryKey: ["challenge_jury"] });
    }
  }

  async function removeJury(id: string) {
    await d1DeleteServerFn({ data: { table: "challenge_jury", id } });
    toast.success("Membre du jury retiré");
    qc.invalidateQueries({ queryKey: ["challenge_jury"] });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copié dans le presse-papiers`);
  }

  function copyInvitation(j: ChallengeJury) {
    const { body } = getJuryEmailContent(j);
    navigator.clipboard.writeText(body);
    toast.success("Message d'invitation complet copié !");
  }

  return (
    <div className="space-y-6">
      <Panel title="Ajouter un membre du Jury (7 Dimensions)">
        <form onSubmit={addJury} className="grid gap-3 sm:grid-cols-5 items-end">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nom complet</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex. Sarah Connor"
              className="field text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="sarah@expert.dev"
              className="field text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Dimension Jury (7D)</label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="field text-xs font-bold text-accent"
            >
              {JURY_DIMENSIONS_LIST.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="field text-xs">
              <option value="expert">Expert Juré</option>
              <option value="lead">Président du Jury (Lead)</option>
              <option value="mentor">Mentor Délibération</option>
            </select>
          </div>
          <button disabled={busy} className="btn-base btn-glow text-xs flex items-center justify-center gap-1.5 h-10">
            <Plus className="h-3.5 w-3.5" /> Ajouter au Jury
          </button>
        </form>
      </Panel>

      <Panel title={`Collège du Jury (${juryMembers.length})`}>
        {isLoading ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        ) : !juryMembers.length ? (
          <Empty title="Aucun juré" text="Renseigne le premier membre du jury ci-dessus." />
        ) : (
          <ul className="divide-y divide-line">
            {juryMembers.map((j) => (
              <li key={j.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink text-sm">{j.name}</p>
                    <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                      {(j as any).dimension || "development"}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                      {j.role}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{j.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono bg-accent/10 text-accent font-bold px-2 py-1 rounded">
                    Code : {j.code}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEmailModalJury(j)}
                    title="Envoyer les accès par email"
                    className="btn-base btn-ghost text-xs inline-flex items-center gap-1 text-accent border border-accent/20"
                  >
                    <Mail className="h-3.5 w-3.5" /> Envoyer accès
                  </button>

                  <button
                    type="button"
                    onClick={() => copyCode(j.code)}
                    title="Copier le code jury"
                    className="btn-base btn-ghost text-xs inline-flex items-center gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Code
                  </button>

                  <button
                    onClick={() => removeJury(j.id)}
                    className="icon-button text-destructive hover:bg-destructive/10"
                    title="Supprimer le membre du jury"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Modal d'envoi d'email Jury */}
      {emailModalJury && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-ink text-sm">Transmission des accès Jury</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pour {emailModalJury.name} ({emailModalJury.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalJury(null)}
                className="icon-button text-muted-foreground hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-line bg-paper p-3 space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold">
                  Code Jury Unique
                </span>
                <p className="font-mono text-xl font-black text-accent tracking-widest">
                  {emailModalJury.code}
                </p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground text-[11px] block mb-1">
                  Aperçu du message :
                </span>
                <pre className="p-3 rounded-lg border border-line bg-paper text-[11px] font-mono whitespace-pre-wrap text-ink/90 max-h-48 overflow-y-auto leading-relaxed">
                  {getJuryEmailContent(emailModalJury).body}
                </pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-line">
              <a
                href={`mailto:${emailModalJury.email}?subject=${encodeURIComponent(
                  getJuryEmailContent(emailModalJury).subject
                )}&body=${encodeURIComponent(getJuryEmailContent(emailModalJury).body)}`}
                onClick={() => {
                  toast.success("Client mail ouvert !");
                  setEmailModalJury(null);
                }}
                className="btn-base btn-glow text-xs flex-1 inline-flex items-center justify-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" /> Ouvrir mon Client Mail
              </a>
              <button
                type="button"
                onClick={() => {
                  copyInvitation(emailModalJury);
                  setEmailModalJury(null);
                }}
                className="btn-base btn-outline text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copier l'invitation
              </button>
              <button
                type="button"
                onClick={() => setEmailModalJury(null)}
                className="btn-base btn-ghost text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= 5. TAB SUBMISSIONS & EVALUATIONS ================= */
function ChallengeSubmissionsTab({
  challenges,
  selectedChallengeId,
  onSelectChallenge,
}: {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: submissions = [], isLoading } = useChallengeSubmissions(selectedChallengeId);
  const { data: evaluations = [] } = useChallengeEvaluations(selectedChallengeId);
  const [forwarded, setForwarded] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("aifac_forwarded_submissions") || "{}");
    } catch {
      return {};
    }
  });

  function forwardToJury(sub: ChallengeSubmission) {
    const next = { ...forwarded, [sub.id]: true };
    setForwarded(next);
    try {
      localStorage.setItem("aifac_forwarded_submissions", JSON.stringify(next));
    } catch {}
    toast.success(`Le projet « ${sub.title} » a été validé et transmis au collège des jurés.`);
  }

  return (
    <Panel title="Soumissions & Projets déposés par les Inbuilders">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Challenge sélectionné</label>
          <select
            value={selectedChallengeId}
            onChange={(e) => onSelectChallenge(e.target.value)}
            className="field text-xs sm:w-80"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
          <span className="text-[11px] text-ink font-medium">
            Workflow InnerBuild : les soumissions arrivent d'abord à l'admin qui les vérifie avant transmission aux jurés.
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : !submissions.length ? (
        <Empty title="Aucun projet soumis" text="Les dépôts des participants s'afficheront ici." />
      ) : (
        <ul className="divide-y divide-line">
          {submissions.map((s) => {
            const ev = evaluations.find((e) => e.submission_id === s.id);
            const isTransferred = forwarded[s.id] || Boolean(ev);
            return (
              <li key={s.id} className="py-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-ink text-sm">{s.title}</h4>
                      {isTransferred ? (
                        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Transmis aux Jurés
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Reçu (En attente d'envoi)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Par {s.user_id.slice(0, 8)} · Envoyé le {new Date(s.submitted_at).toLocaleDateString("fr-FR")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {s.repo_url && (
                        <a href={s.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline font-mono">
                          <Github className="h-3.5 w-3.5" /> Dépôt GitHub <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {s.demo_url && (
                        <a href={s.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald hover:underline font-mono">
                          <ExternalLink className="h-3.5 w-3.5" /> Démo Live
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isTransferred && (
                      <button
                        onClick={() => forwardToJury(s)}
                        className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" /> Transmettre au Jury
                      </button>
                    )}

                    {ev ? (
                      <span className="rounded-full bg-emerald/15 px-3 py-1 text-xs font-bold text-emerald flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" /> Note Jury : {ev.score}/100
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600">
                        En attente de notation
                      </span>
                    )}
                  </div>
                </div>

                {s.description && (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">{s.description}</p>
                )}

                {ev && ev.feedback && (
                  <div className="text-xs border border-accent/20 bg-accent/5 p-3 rounded-lg text-ink">
                    <p className="font-bold text-accent mb-0.5">Avis du Jury ({ev.jury_name}) :</p>
                    <p className="whitespace-pre-line leading-relaxed">{ev.feedback}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ================= 6. TAB RESULTS & LEADERBOARD ================= */
function ChallengeResultsTab({
  challenges,
  selectedChallengeId,
  onSelectChallenge,
}: {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: results = [], isLoading } = useChallengeResults(selectedChallengeId);
  const { data: submissions = [] } = useChallengeSubmissions(selectedChallengeId);
  const { data: evaluations = [] } = useChallengeEvaluations(selectedChallengeId);
  const [busy, setBusy] = useState(false);

  async function generateAndPublishLeaderboard() {
    if (!submissions.length) {
      toast.danger("Aucune soumission à classer.");
      return;
    }
    setBusy(true);

    try {
      // Calculate scores
      const computed = submissions.map((s) => {
        const ev = evaluations.find((e) => e.submission_id === s.id);
        const score = ev ? Number(ev.score) : 0;
        return { s, score };
      });

      computed.sort((a, b) => b.score - a.score);

      // Clean old (D1 : suppression ligne par ligne) and insert
      const existing = await d1ListServerFn({
        data: { table: "challenge_results", where: { challenge_id: selectedChallengeId }, limit: 500 },
      });
      for (const row of (existing.rows || []) as any[]) {
        if (row?.id) {
          await d1DeleteServerFn({ data: { table: "challenge_results", id: row.id } });
        }
      }

      const toInsert = computed.map((item, idx) => ({
        challenge_id: selectedChallengeId,
        submission_id: item.s.id,
        user_id: item.s.user_id,
        final_score: item.score,
        rank: idx + 1,
        award: idx === 0 ? "1er Prix (Grand Vainqueur)" : idx === 1 ? "2e Prix" : idx === 2 ? "3e Prix" : "",
        is_published: 1,
      }));

      for (const row of toInsert) {
        const res = await d1InsertServerFn({ data: { table: "challenge_results", row } });
        if (!res.success) throw new Error(res.error || "D1");
      }

      toast.success("Classement officiel publié avec succès !");
      await logAudit("Résultats publiés", selectedChallengeId, "Publication du leaderboard officiel du challenge");
      qc.invalidateQueries({ queryKey: ["challenge_results"] });
    } catch (err: any) {
      toast.danger("Erreur : " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Résultats Officiels & Podium InnerBuild">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Challenge</label>
          <select
            value={selectedChallengeId}
            onChange={(e) => onSelectChallenge(e.target.value)}
            className="field text-xs sm:w-80"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <button
          disabled={busy}
          onClick={generateAndPublishLeaderboard}
          className="btn-base btn-glow text-xs flex items-center gap-1.5 self-start sm:self-end"
        >
          <Trophy className="h-4 w-4" /> {busy ? "Calcul…" : "Calculer & Publier le Classement"}
        </button>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : !results.length ? (
        <Empty
          title="Aucun classement publié"
          text="Clique sur « Calculer & Publier le Classement » dès que les jurés ont évalué les projets."
        />
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                r.rank === 1
                  ? "border-amber-500/40 bg-amber-500/10 font-bold"
                  : r.rank === 2
                  ? "border-slate-400/40 bg-slate-400/10 font-semibold"
                  : r.rank === 3
                  ? "border-amber-700/40 bg-amber-700/10 font-semibold"
                  : "border-line bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper font-mono font-bold text-xs">
                  #{r.rank}
                </span>
                <div>
                  <p className="font-bold text-ink text-sm">Participant {r.user_id.slice(0, 8)}</p>
                  {r.award && <p className="text-accent text-[11px] font-semibold">{r.award}</p>}
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-ink">{r.final_score}</span>
                <span className="text-muted-foreground text-[10px]"> / 100</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ================= 7. TAB STATS & ANALYTICS ================= */
function ChallengeStatsTab({
  challenges,
  selectedChallengeId,
  onSelectChallenge,
}: {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (id: string) => void;
}) {
  const { data: submissions = [] } = useChallengeSubmissions(selectedChallengeId);
  const { data: evaluations = [] } = useChallengeEvaluations(selectedChallengeId);
  const { data: registrations = [] } = useChallengeRegistrations(selectedChallengeId);
  const { data: juryMembers = [] } = useChallengeJury(selectedChallengeId);

  const currentChallenge = challenges.find((c) => c.id === selectedChallengeId) || challenges[0];

  // 1. Evaluations vs Pending Data for PieChart
  const evaluatedCount = evaluations.length;
  const pendingCount = Math.max(0, submissions.length - evaluatedCount);
  const pieData = [
    { name: "Projets Évalués", value: evaluatedCount, color: "#10B981" },
    { name: "En attente", value: pendingCount, color: "#F59E0B" },
  ];

  // 2. Average criteria scores
  const avgUi = evaluations.length
    ? Number((evaluations.reduce((acc, e) => acc + (e.score_ui || 0), 0) / evaluations.length).toFixed(1))
    : 0;
  const avgArch = evaluations.length
    ? Number((evaluations.reduce((acc, e) => acc + (e.score_architecture || 0), 0) / evaluations.length).toFixed(1))
    : 0;
  const avgSpec = evaluations.length
    ? Number((evaluations.reduce((acc, e) => acc + (e.score_cahier_charges || 0), 0) / evaluations.length).toFixed(1))
    : 0;
  const avgDemo = evaluations.length
    ? Number((evaluations.reduce((acc, e) => acc + (e.score_delivery || 0), 0) / evaluations.length).toFixed(1))
    : 0;

  const criteriaData = [
    { critere: "Design UI/UX", moyenne: avgUi, max: 25 },
    { critere: "Architecture", moyenne: avgArch, max: 25 },
    { critere: "Cahier charges", moyenne: avgSpec, max: 25 },
    { critere: "Démo Live", moyenne: avgDemo, max: 25 },
  ];

  const evalRate = submissions.length
    ? Math.round((evaluatedCount / submissions.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Panel title="Analytique & Tableau de Bord Hackathon">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Challenge sélectionné
            </label>
            <select
              value={selectedChallengeId}
              onChange={(e) => onSelectChallenge(e.target.value)}
              className="field text-xs sm:w-80"
            >
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded bg-accent/10 px-2.5 py-1 font-mono font-bold text-accent">
              Statut : {currentChallenge?.status || "actif"}
            </span>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Stat label="Inscriptions Candidats" value={String(registrations.length)} />
          <Stat label="Projets Reçus" value={String(submissions.length)} />
          <Stat label="Collège Jurés" value={String(juryMembers.length)} />
          <Stat label="Taux d'Évaluation" value={`${evalRate}%`} />
        </div>

        {/* Recharts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart 1: Critères d'évaluation */}
          <div className="rounded-xl border border-line bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-ink text-sm">Moyenne par Critère de Notation</h4>
                <p className="text-[11px] text-muted-foreground">Notes moyennes attribuées sur /25 points</p>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                BarChart
              </span>
            </div>

            <div className="h-64 w-full">
              {evaluations.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Aucune évaluation notée pour le moment
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={criteriaData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="critere"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 25]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`${val} / 25 pts`, "Moyenne"]}
                    />
                    <Bar dataKey="moyenne" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Avancement des Évaluations */}
          <div className="rounded-xl border border-line bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-ink text-sm">Statut des Projets & Notations</h4>
                <p className="text-[11px] text-muted-foreground">Répartition des projets évalués vs en attente</p>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                PieChart
              </span>
            </div>

            <div className="h-64 w-full">
              {submissions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Aucun projet soumis pour ce challenge
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
