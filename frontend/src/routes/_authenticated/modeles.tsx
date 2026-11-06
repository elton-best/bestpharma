import { PageCatalogueCanevas } from "@/components/modules/canevas-documentaires";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  BookOpen,
  Sparkles,
  Download,
  Printer,
  ShieldCheck,
  Layers,
  FolderDown,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { telechargerCsv, telechargerTexte, imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BoutonCreerNC,
  LienReglementaireBpd,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/modeles")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bibliothèque des 59 Modèles BPD — BestPharma" },
      {
        name: "description",
        content:
          "Bibliothèque complète des 59 modèles de procédures, modes opératoires et registres conformes au Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageCatalogueCanevas,
});

interface ModeleBpd {
  id: string;
  code_ref: string;
  processus: string;
  type_document: string;
  titre: string;
  objet: string | null;
  domaine_application: string | null;
  contenu_modele: string;
  articles_guide: string | null;
  duree_conservation_ans: number;
}

const libellesProcessus: Record<string, string> = {
  tous: "Tous les processus",
  TAM: "TAM · Direction & Organisation",
  QAM: "QAM · Système Qualité & Audit",
  GAD: "GAD · Dispensation & Caisse",
  GAC: "GAC · Achats & Chaîne du Froid",
  GAR: "GAR · Ressources & Locaux",
};

function PageModeles() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("catalogue");
  const [filtreProcessus, setFiltreProcessus] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [modeleActif, setModeleActif] = useState<ModeleBpd | null>(null);

  const { data: modeles = [] } = useQuery<ModeleBpd[]>({
    queryKey: ["modeles-bpd"],
    queryFn: async () => {
      return api.get<ModeleBpd[]>("/api/modeles-bpd");
    },
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["documents-adoptions", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any[]>(`/api/officines/${id}/documents`);
    },
  });

  const instancier = useMutation({
    mutationFn: async (modeleId: string) => {
      return api.post(`/api/officines/${id}/modeles-bpd/${modeleId}/instancier`);
    },
    onSuccess: (_data, _vars) => {
      toast.success(
        "Modèle type adopté avec succès dans votre GED (créé en mode brouillon avec vos variables préremplies)."
      );
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents-adoptions"] });
      setModeleActif(null);
    },
    onError: (e: any) =>
      toast.error(e?.message || "Erreur lors de l'adoption du modèle"),
  });

  // Calcul du taux d'adoption (MOD-06)
  const codesAdoptes = new Set(documents.map((d) => d.code_document));
  const totalModeles = modeles.length || 59;
  const modelesAdoptesCount = modeles.filter((m) => codesAdoptes.has(m.code_ref)).length;
  const tauxAdoption = totalModeles > 0 ? Math.round((modelesAdoptesCount / totalModeles) * 100) : 0;

  // Filtrage local
  const modelesFiltres = modeles.filter((m) => {
    const matchProcessus = filtreProcessus === "tous" || m.processus === filtreProcessus;
    const matchSearch =
      !recherche.trim() ||
      (m.titre ?? "").toLowerCase().includes(recherche.toLowerCase()) ||
      (m.code_ref ?? "").toLowerCase().includes(recherche.toLowerCase()) ||
      (m.articles_guide && (m.articles_guide ?? "").toLowerCase().includes(recherche.toLowerCase()));
    return matchProcessus && matchSearch;
  });

  const exporterCsvModeles = () => {
    if (!modeles.length) {
      toast.info("Aucun modèle à exporter.");
      return;
    }
    telechargerCsv(
      modeles.map((m) => ({
        code: m.code_ref,
        processus: m.processus,
        titre: m.titre,
        type: m.type_document,
        articles: m.articles_guide || "—",
        duree_conservation: `${m.duree_conservation_ans || 5} ans`,
        adopte: codesAdoptes.has(m.code_ref) ? "OUI" : "NON",
      })),
      `Catalogue_59_Modeles_BPD_BestPharma_${new Date().toISOString().split("T")[0]}.csv`,
      [
        { cle: "code", entete: "Code Référence" },
        { cle: "processus", entete: "Processus BPD" },
        { cle: "titre", entete: "Titre du Modèle" },
        { cle: "type", entete: "Type de document" },
        { cle: "articles", entete: "Articles Guide BPD" },
        { cle: "duree_conservation", entete: "Conservation légale" },
        { cle: "adopte", entete: "Adopté dans l'officine" },
      ]
    );
    toast.success("Catalogue des 59 modèles BPD exporté en CSV");
  };

  const imprimerModele = (m: any) => {
    const html = `
      <div style="margin-bottom: 20px; padding: 16px; border: 2px solid #0F3B27; border-radius: 8px; background: #F7FBF8;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; color: #0F3B27;">${m.titre}</h2>
          <span style="font-family: monospace; font-size: 16px; font-weight: bold; background: #0F3B27; color: #92FF5F; padding: 4px 10px; border-radius: 4px;">
            ${m.code_ref}
          </span>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #475C50;">
          Processus ${m.processus} · Articles Guide BPD : ${m.articles_guide || "Conformité générale"} · Conservation légale : ${m.duree_conservation_ans || 5} ans
        </p>
      </div>

      <div style="padding: 16px; border: 1px solid #CFF1D2; border-radius: 8px; background: #ffffff; white-space: pre-wrap; font-family: sans-serif; font-size: 13px; line-height: 1.7; color: #0F3B27;">
${m.contenu_modele}
      </div>
    `;

    imprimerFicheOfficielle(`Modèle BPD ${m.code_ref} — ${m.titre}`, html);
    toast.success(`Trame du modèle ${m.code_ref} prête pour impression !`);
  };

  const optionsSectionsModeles: OptionSection[] = [
    {
      valeur: "catalogue",
      label: `Catalogue des Modèles (${modeles.length})`,
      description: "Modèles types conformes au Guide BPD de l'ABMed",
      badge: `${modeles.length}`,
    },
    {
      valeur: "adoptions",
      label: `Mes Adoptions (${modelesAdoptesCount})`,
      description: "Modèles déjà intégrés et adaptés à votre officine",
      badge: `${modelesAdoptesCount}/${totalModeles}`,
    },
    {
      valeur: "mises-a-jour",
      label: "Mises à Jour du Catalogue",
      description: "Évolutions réglementaires ABMed et nouvelles versions",
    },
    {
      valeur: "propres",
      label: "Modèles de l'Officine",
      description: "Trames personnalisées créées pour votre équipe",
    },
  ];

  // VRAIE PAGE DE CONSULTATION & ADOPTION DU MODÈLE
  if (modeleActif) {
    const estAdopte = codesAdoptes.has(modeleActif.code_ref);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setModeleActif(null)}
              className="border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 font-bold text-xs gap-1.5 rounded-[10px] shrink-0"
            >
              <ArrowLeft className="size-4" /> Retour
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/60 px-2.5 py-0.5 rounded-[6px]">
                  {modeleActif.code_ref}
                </span>
                <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">
                  Processus {modeleActif.processus}
                </Badge>
                <Badge variant="outline" className="border-[#CFF1D2] text-[#0F3B27] text-[10px]">
                  {modeleActif.type_document}
                </Badge>
                {estAdopte && (
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    ✓ Déjà adopté
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0F3B27] mt-1">
                {modeleActif.titre}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => imprimerModele(modeleActif)}
              className="border-[#CFF1D2] text-[#0F3B27] gap-1.5 text-xs font-semibold rounded-[10px]"
            >
              <Printer className="size-3.5" /> Imprimer / PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                telechargerTexte(modeleActif.contenu_modele, `Trame_${modeleActif.code_ref}.txt`, "text/plain");
                toast.success("Trame textuelle téléchargée !");
              }}
              className="border-[#CFF1D2] text-[#0F3B27] gap-1.5 text-xs font-semibold rounded-[10px]"
            >
              <Download className="size-3.5" /> Télécharger (.txt)
            </Button>
            <Button
              disabled={instancier.isPending}
              onClick={() => instancier.mutate(modeleActif.id)}
              className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 rounded-[10px]"
            >
              <Sparkles className="size-4" />
              {instancier.isPending ? "Adoption en cours…" : "Adopter ce Modèle dans la GED"}
            </Button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL DU MODÈLE */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-6 shadow-sm">
              <div className="text-xs leading-relaxed text-[#0F3B27] whitespace-pre-wrap font-sans">
                {modeleActif.contenu_modele}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-xs text-[#0F3B27] uppercase tracking-wider">Informations Modèle</h3>
              <div className="space-y-2 text-xs divide-y divide-[#CFF1D2]/50">
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Code Référence :</span>
                  <strong className="font-mono text-[#0F3B27]">{modeleActif.code_ref}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Processus :</span>
                  <strong>{modeleActif.processus}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Type :</span>
                  <span className="capitalize">{modeleActif.type_document?.replace("_", " ")}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Conservation légale :</span>
                  <strong>{modeleActif.duree_conservation_ans || 5} ans</strong>
                </div>
                {modeleActif.articles_guide && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-0.5">Articles Guide BPD :</span>
                    <strong className="text-emerald-700">{modeleActif.articles_guide}</strong>
                  </div>
                )}
                {modeleActif.objet && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-0.5">Objet :</span>
                    <p className="text-[#475C50]">{modeleActif.objet}</p>
                  </div>
                )}
                {modeleActif.domaine_application && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-0.5">Domaine d'application :</span>
                    <p className="text-[#475C50]">{modeleActif.domaine_application}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Bibliothèque de Modèles Qualité
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Modèles documentaires prêts à l'emploi. Intégrez-les directement dans votre gestion documentaire avec les informations de votre officine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exporterCsvModeles}
            className="h-10 text-xs border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/20 gap-1.5 rounded-[10px]"
          >
            <Download className="size-4" /> Exporter Catalogue (CSV)
          </Button>

          {/* Jauge d'adoption rapide */}
          <div className="rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] p-2 px-3.5 text-right">
            <div className="text-[10px] font-bold text-[#475C50] uppercase tracking-wider">Taux d'Adoption BPD</div>
            <div className="font-display text-lg font-black text-[#0F3B27]">{tauxAdoption}%</div>
            <span className="text-[10px] text-emerald-800 font-semibold">{modelesAdoptesCount} sur {totalModeles} adoptés</span>
          </div>
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT DES SECTIONS MODÈLES */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <BookOpen className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Catalogue des Modèles</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez la section à afficher ou filtrez par mot-clé</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={optionsSectionsModeles}
            valeur={activeTab}
            onChangement={setActiveTab}
            placeholder="Choisir une section..."
            recherchePlaceholder="Filtrer parmi les 4 sections..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* TABS DE LA PAGE */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. CATALOGUE COMPLET */}
        <TabsContent value="catalogue" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#CFF1D2]">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code (ex: TAM-DO-001) ou titre..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground shrink-0" />
              <select
                value={filtreProcessus}
                onChange={(e) => setFiltreProcessus(e.target.value)}
                className="h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-medium"
              >
                {Object.entries(libellesProcessus).map(([code, lib]) => (
                  <option key={code} value={code}>{lib}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modelesFiltres.map((m) => {
              const estAdopte = codesAdoptes.has(m.code_ref);

              return (
                <Card
                  key={m.id}
                  onClick={() => setModeleActif(m)}
                  className={`cursor-pointer border-2 rounded-2xl bg-white p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                    estAdopte ? "border-emerald-500/50 bg-emerald-50/10" : "border-[#CFF1D2]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/50 px-2 py-0.5 rounded border border-[#0F3B27]/20">
                        {m.code_ref}
                      </span>
                      <Badge
                        variant={estAdopte ? "default" : "secondary"}
                        className={estAdopte ? "bg-emerald-600 text-[10px]" : "text-[10px]"}
                      >
                        {estAdopte ? "✓ Déjà Adopté" : "À adopter"}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-[#0F3B27] text-sm line-clamp-2 leading-tight">
                      {m.titre}
                    </h3>

                    {m.articles_guide && (
                      <span className="inline-block text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Réf. {m.articles_guide}
                      </span>
                    )}

                    <p className="text-xs text-muted-foreground line-clamp-3 bg-[#F7F9F7] p-2.5 rounded-xl border border-[#CFF1D2] leading-relaxed">
                      {m.objet || m.contenu_modele}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#CFF1D2] flex items-center justify-between text-[11px] text-[#475C50] mt-3">
                    <span>Conservation : {m.duree_conservation_ans} ans</span>
                    <span className="font-bold text-[#0F3B27] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Aperçu &rarr;
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. MES ADOPTIONS (MOD-02 & MOD-06) */}
        <TabsContent value="adoptions" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Modèles Types BPD Adoptés par votre Officine
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Documents actuellement instanciés et gérés dans votre circuit documentaire officiel.
                </CardDescription>
              </div>
              <Link to="/documents">
                <Button size="sm" variant="outline" className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1">
                  Accéder à la GED &rarr;
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {modeles
                .filter((m) => codesAdoptes.has(m.code_ref))
                .map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/40 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-emerald-900">{m.code_ref}</span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Actif GED</Badge>
                    </div>
                    <span className="font-bold text-[#0F3B27] block leading-tight">{m.titre}</span>
                  </div>
                ))}
            </div>
          </Card>
        </TabsContent>

        {/* 3. MISES À JOUR DU CATALOGUE (MOD-07) */}
        <TabsContent value="mises-a-jour" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Veille Réglementaire & Mises à Jour du Catalogue
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Notifications de mise à niveau publiées par BestPharma en conformité avec les arrêtés du Ministère de la Santé.
            </CardDescription>

            <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs text-muted-foreground text-center">
              <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1.5" />
              Tous vos modèles de base sont conformes à la version 2026 du Guide BPD ABMed.
            </div>
          </Card>
        </TabsContent>

        {/* 4. MODÈLES PROPRES À L'OFFICINE (MOD-08) */}
        <TabsContent value="propres" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Modèles Personnalisés de l'Officine
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Ajoutez vos propres matrices internes suivant la même codification.
                </CardDescription>
              </div>
              <Button size="sm" className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1">
                <Plus className="size-3.5" /> Ajouter un modèle
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs text-muted-foreground text-center">
              Aucun modèle spécifique ajouté. Les 59 modèles officiels couvrent l'intégralité du Guide BPD.
            </div>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}
