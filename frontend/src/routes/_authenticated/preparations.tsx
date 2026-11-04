import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Beaker,
  Package,
  ScanLine,
  Download,
  Upload,
  ClipboardCheck,
  Printer,
  TestTube,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/preparations")({
  head: () => ({
    meta: [
      { title: "Préparations Magistrales — BEGPHARMA" },
      { name: "description", content: "Cahier préparations magistrales & officinales : traçabilité MP, contrôles libératoires, visa pharmacien, étiquettes — BPD Chap. 6 & POI-03" },
    ],
  }),
  component: PagePreparationsLabo,
});

interface PreparationItem {
  id: string;
  numero_preparation: string;
  nom_preparation: string;
  type_preparation: "magistrale" | "officinale";
  formule_detaillee: string;
  matieres_premieres_lots?: any[];
  quantite_produite: string;
  conditionnement: string;
  date_fabrication: string;
  date_limite_utilisation: string;
  patient_nom?: string;
  prescripteur_nom?: string;
  conforme: boolean;
  controles_effectues?: string;
  executant?: { name: string };
  pharmacien_visa?: { name: string };
}

function ZoneDepot({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#CFF1D2] bg-[#F7F9F7] p-6 text-center">
      <Upload className="mx-auto w-6 h-6 text-[#475C50]" />
      <p className="mt-2 text-xs font-bold text-[#0F3B27]">{label}</p>
      <p className="text-[11px] text-[#475C50]">JPG/PNG/PDF/CSV 10 Mo — SHA-256 + chiffrage — hors-ligne en file</p>
    </div>
  );
}

function PagePreparationsLabo() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("registre");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [nomPreparation, setNomPreparation] = useState("");
  const [typePreparation, setTypePreparation] = useState<"magistrale" | "officinale">("magistrale");
  const [formuleDetaillee, setFormuleDetaillee] = useState("");
  const [quantiteProduite, setQuantiteProduite] = useState("");
  const [conditionnement, setConditionnement] = useState("Flacon teinté hermétique");
  const [dateFabrication, setDateFabrication] = useState(new Date().toISOString().split("T")[0]);
  const [dateLimiteUtilisation, setDateLimiteUtilisation] = useState("");
  const [patientNom, setPatientNom] = useState("");
  const [prescripteurNom, setPrescripteurNom] = useState("");
  const [controlesEffectues, setControlesEffectues] = useState("Aspect homogène, absence de particules, pH conforme, masse unitaire vérifiée.");
  const [matieresLots, setMatieresLots] = useState("");

  const { data: prepsData, isLoading } = useQuery<{
    data: { data: PreparationItem[]; total: number };
  }>({
    queryKey: ["preparations"],
    queryFn: () => api.get("/preparations"),
  });
  const { data: produitsData } = useQuery<{ data: any[] }>({
    queryKey: ["produits"],
    queryFn: () => api.get("/produits").catch(() => ({ data: [] } as any)),
  });

  const mutationCreer = useMutation({
    mutationFn: (payload: any) => api.post("/preparations", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Préparation inscrite — traçabilité MP enregistrée");
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
      setDialogOuvert(false);
      setNomPreparation(""); setFormuleDetaillee(""); setQuantiteProduite(""); setMatieresLots("");
    },
    onError: (err: any) => toast.error(err.message),
  });
  const mutationViser = useMutation({
    mutationFn: (id: string) => api.post(`/preparations/${id}/viser`, {}),
    onSuccess: (res: any) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["preparations"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const preparations: PreparationItem[] = (prepsData as any)?.data?.data || (prepsData as any)?.data || [];
  const produits = (produitsData as any)?.data || [];
  const enAttente = preparations.filter(p => !p.pharmacien_visa);
  const liberees = preparations.filter(p => !!p.pharmacien_visa);
  const magistrales = preparations.filter(p => p.type_preparation === "magistrale");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPreparation || !formuleDetaillee || !quantiteProduite || !dateLimiteUtilisation) { toast.error("Champs obligatoires manquants"); return; }
    let mpLots: any[] = [];
    if (matieresLots) {
      try { mpLots = JSON.parse(matieresLots); } catch { mpLots = [{ saisie_libre: matieresLots }]; }
    }
    mutationCreer.mutate({
      nom_preparation: nomPreparation,
      type_preparation: typePreparation,
      formule_detaillee: formuleDetaillee,
      matieres_premieres_lots: mpLots.length ? mpLots : undefined,
      quantite_produite: quantiteProduite,
      conditionnement,
      date_fabrication: dateFabrication,
      date_limite_utilisation: dateLimiteUtilisation,
      patient_nom: patientNom || null,
      prescripteur_nom: prescripteurNom || null,
      controles_effectues: controlesEffectues,
      conforme: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F3B27]">Préparations Magistrales & Officinales</h1>
            <Badge className="bg-[#0F3B27] text-[#92FF5F]">BPD Chap. 6 · POI-03</Badge>
            <Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">PRE</Badge>
          </div>
          <p className="mt-1 text-sm text-[#475C50] max-w-2xl">Traçabilité des formules, matières premières par lot, contrôles libératoires et visa pharmacien — étiquette posologie + n° ordre + adresse officine (BPD7-F15).</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F3B27] text-white px-3 py-1"><FlaskConical className="w-3 h-3" /> Cahier coté & paraphé</span>
            <span className="rounded-full border border-[#CFF1D2] bg-white px-3 py-1 text-[#0F3B27]">Conservation 10 ans</span>
            <span className="rounded-full bg-[#CFF1D2] px-3 py-1 text-[#0F3B27]">{magistrales.length} magistrales</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setDialogOuvert(true)} className="gap-2 bg-[#0F3B27] hover:bg-[#164E35] text-white font-bold"><Plus className="w-4 h-4" /> Inscrire une préparation</Button>
          <Badge variant="outline" className="justify-center border-amber-300 bg-amber-50 text-amber-800 text-xs">{enAttente.length} en attente de libération</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#CFF1D2] bg-white px-4 py-2.5 text-xs font-bold text-[#0F3B27]">
        <span className="flex items-center gap-1"><Beaker className="w-3.5 h-3.5" /> Laboratoire officine</span>
        <span className="text-[#475C50]">•</span>
        <span>{preparations.length} préparations</span>
        <span className="text-[#475C50]">•</span>
        <span className="text-emerald-700">{liberees.length} libérées</span>
        <span className="text-[#475C50]">•</span>
        <span className="text-amber-700">{enAttente.length} à contrôler</span>
        <span className="ml-auto rounded-full bg-[#F7F9F7] border border-[#CFF1D2] px-2.5 py-1">DLU = date fabric. + stabilité</span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto flex-wrap gap-1 bg-[#F7F9F7] p-1 border border-[#CFF1D2] rounded-2xl">
            <TabsTrigger value="registre" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-white"><FileText className="w-3.5 h-3.5" /> Registre</TabsTrigger>
            <TabsTrigger value="formules" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-white"><Beaker className="w-3.5 h-3.5" /> Formules</TabsTrigger>
            <TabsTrigger value="matieres" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-white"><TestTube className="w-3.5 h-3.5" /> Matières premières</TabsTrigger>
            <TabsTrigger value="controles" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-white"><ClipboardCheck className="w-3.5 h-3.5" /> Contrôles</TabsTrigger>
            <TabsTrigger value="etiquettes" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-white"><Printer className="w-3.5 h-3.5" /> Étiquettes</TabsTrigger>
            <TabsTrigger value="rapports" className="gap-1.5 text-xs font-bold data-[state=active]:bg-[#0F3B27] data-[state=active]:text-white"><Download className="w-3.5 h-3.5" /> Rapports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="registre" className="space-y-4 mt-4">
          <Card className="border-[#CFF1D2]">
            <CardHeader><CardTitle className="text-sm font-black text-[#0F3B27]">Registre officiel — numéroté consécutivement (PREP-2026-0001)</CardTitle><CardDescription>Chaque préparation porte formule détaillée, lots MP, contrôles et visa — immuable après libération</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="p-8 text-center text-[#475C50]">Chargement...</div> : preparations.length===0 ? <div className="p-8 text-center text-[#475C50]">Aucune préparation — inscrivez la première formule (Pâte à l'eau, Sirop de Tolu...)</div> : (
                <div className="overflow-x-auto"><table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F9F7] text-[#475C50] border-b border-[#CFF1D2] font-bold"><tr><th className="py-2 px-3">N°</th><th className="py-2 px-3">Intitulé & formule</th><th className="py-2 px-3">Type & Qté</th><th className="py-2 px-3">Patient</th><th className="py-2 px-3">DLU</th><th className="py-2 px-3">Visa</th></tr></thead>
                  <tbody className="divide-y divide-[#CFF1D2]/50">
                    {preparations.map(p=>(
                      <tr key={p.id} className="hover:bg-[#F7F9F7]">
                        <td className="py-2 px-3 font-mono font-black text-[#0F3B27]">{p.numero_preparation}<div className="text-[10px] font-normal text-[#475C50]">{p.date_fabrication}</div></td>
                        <td className="py-2 px-3"><div className="font-bold text-[#0F3B27]">{p.nom_preparation}</div><div className="text-[11px] text-[#475C50] max-w-md line-clamp-2">{p.formule_detaillee}</div><div className="text-[10px] text-[#475C50]">{p.conditionnement}</div></td>
                        <td className="py-2 px-3"><Badge variant="outline" className="text-[11px] border-[#CFF1D2]">{p.type_preparation}</Badge><div className="font-bold mt-1">{p.quantite_produite}</div></td>
                        <td className="py-2 px-3"><div className="font-bold">{p.patient_nom || "Officinale"}</div><div className="text-[#475C50]">{p.prescripteur_nom || ""}</div></td>
                        <td className="py-2 px-3 font-mono text-[11px]">{p.date_limite_utilisation}</td>
                        <td className="py-2 px-3">{p.pharmacien_visa ? <Badge className="bg-[#0F3B27] text-white text-[11px] gap-1"><ShieldCheck className="w-3 h-3" /> {p.pharmacien_visa.name}</Badge> : <Button variant="outline" size="sm" onClick={()=> mutationViser.mutate(p.id)} className="h-7 text-xs border-amber-300 text-amber-800">Libérer & viser</Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formules" className="space-y-4 mt-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><Beaker className="w-5 h-5 text-[#92FF5F]" /> Bibliothèque des formules (officinales)</CardTitle><CardDescription className="text-[#CFF1D2]">Formules types de l'officine : composition exacte, mode opératoire, DLU standard, conditionnement</CardDescription></CardHeader><CardContent className="text-xs text-[#CFF1D2]">Exemple : Pâte à l'eau (oxyde zinc 20% + talc 20% + glycérine 20% + eau qsp), Solution antiseptique, Gélules...</CardContent></Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { nom: "Pâte à l'eau", compo: "Oxyde zinc 20g + Talc 20g + Glycérine 20g + Eau qsp 100g", dlu: "30 jours" },
              { nom: "Sirop de Tolu", compo: "Baume Tolu 2% + Saccharose + Eau purifiée", dlu: "14 jours" },
              { nom: "Gélules CBD", compo: "Principe actif + excipient — gélules n°0", dlu: "90 jours" },
            ].map(f=>(
              <Card key={f.nom} className="border-[#CFF1D2]"><CardHeader className="pb-2"><CardTitle className="text-sm font-black text-[#0F3B27]">{f.nom}</CardTitle></CardHeader><CardContent className="text-xs"><div className="text-[#475C50]">{f.compo}</div><div className="mt-2 font-bold text-[#0F3B27]">DLU {f.dlu}</div></CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matieres" className="space-y-4 mt-4">
          <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-black text-[#0F3B27] flex items-center gap-2"><TestTube className="w-4 h-4" /> Traçabilité matières premières (lots + fournisseurs)</CardTitle><CardDescription>Chaque MP liée à son lot fournisseur, certificat d'analyse, DLU matière — contrôle à réception (BPD5-F05)</CardDescription></CardHeader><CardContent className="space-y-3">
            <ZoneDepot label="Certificats d'analyse MP (PDF) — obligatoire par lot" />
            <div className="rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] p-3 text-xs">
              <p className="font-bold text-[#0F3B27]">Format JSON attendu dans le champ `Matières premières lots` :</p>
              <code className="block mt-1 font-mono text-[11px] bg-white border border-[#CFF1D2] rounded-xl p-2">Exemple MP : Oxyde de zinc | lot MP-2026-012 | Cooper | DLM 2027-06-01 | CA-001.pdf</code>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-xs text-left border border-[#CFF1D2] rounded-xl overflow-hidden"><thead className="bg-[#F7F9F7] font-bold text-[#475C50]"><tr><th className="py-2 px-3">Matière</th><th className="py-2 px-3">Lot MP</th><th className="py-2 px-3">Fournisseur</th><th className="py-2 px-3">Qté utilisée</th><th className="py-2 px-3">Certificat</th></tr></thead><tbody className="divide-y divide-[#CFF1D2]/50"><tr><td colSpan={5} className="py-6 text-center text-[#475C50]">Aucune MP tracée — renseignez le champ JSON lors de l'inscription</td></tr></tbody></table></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="controles" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-emerald-300 bg-emerald-50/30"><CardHeader><CardTitle className="text-sm font-black text-emerald-900 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Contrôles libératoires (BPP)</CardTitle></CardHeader><CardContent className="text-xs text-emerald-900 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> Aspect, homogénéité, absence particules</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> Couleur, odeur conformes</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> pH, masse unitaire, volume</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#0F3B27]" /> Conditionnement hermétique, étiquetage</label>
            </CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-sm font-bold text-[#0F3B27]">Visa pharmacien = libération</CardTitle></CardHeader><CardContent className="text-xs text-[#475C50]">Seul le pharmacien peut viser (titulaire/adjoint). Une préparation non visée ne peut être délivrée. Écart → NC/CAPA.</CardContent></Card>
          </div>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-center text-sm text-[#475C50]">{enAttente.length===0 ? "Aucune préparation en attente — toutes libérées ✅" : `${enAttente.length} préparation(s) en attente de visa — action requise`}</CardContent></Card>
        </TabsContent>

        <TabsContent value="etiquettes" className="space-y-4 mt-4">
          <Card className="border-[#0F3B27] bg-[#0F3B27] text-white"><CardHeader><CardTitle className="text-white font-display font-black flex items-center gap-2"><Printer className="w-5 h-5 text-[#92FF5F]" /> Étiquette de conditionnement (BPD7-F15)</CardTitle><CardDescription className="text-[#CFF1D2]">Posologie, n° ordre PREP-2026-XXXX, nom & adresse du pharmacien, DLU, conditions de conservation</CardDescription></CardHeader><CardContent className="text-xs text-[#CFF1D2]">Impression thermique : étiquette quadrichromie avec QR code traçabilité (optionnel).</CardContent></Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#CFF1D2] bg-white"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Aperçu étiquette</CardTitle></CardHeader><CardContent>
              <div className="rounded-xl border-2 border-[#0F3B27] bg-white p-4 font-mono text-xs leading-tight">
                <div className="font-black text-[#0F3B27] text-sm">PHARMACIE DE L'ÉTOILE</div>
                <div className="text-[10px] text-[#475C50]">Av. Steinmetz, Cotonou — Tél. +229 21 31 10 20</div>
                <div className="mt-2 font-bold">Pâte à l'eau — 100g — PREP-2026-0005</div>
                <div className="text-[11px]">Posologie : 2 appl./j sur lésions — DLU : 12/12/2026 — Conserver &lt;25°C</div>
                <div className="mt-2 flex items-center gap-2"><ScanLine className="w-8 h-8" /><span className="text-[10px] text-[#475C50]">QR traçabilité MP lots</span></div>
              </div>
            </CardContent></Card>
            <Card className="border-[#CFF1D2]"><CardHeader><CardTitle className="text-xs font-bold text-[#0F3B27]">Impression</CardTitle></CardHeader><CardContent className="space-y-2"><Button variant="outline" className="w-full font-bold border-[#CFF1D2]"><Printer className="w-4 h-4 mr-1" /> Imprimer étiquette</Button><Button variant="outline" className="w-full font-bold border-[#CFF1D2]"><Download className="w-4 h-4 mr-1" /> PDF GAD-EN</Button></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="rapports" className="space-y-4 mt-4">
          <Card className="border-[#0F3B27] bg-[#F7F9F7]"><CardHeader><CardTitle className="text-sm font-black text-[#0F3B27] flex items-center gap-2"><FileText className="w-4 h-4" /> Rapports & exports — conservation 10 ans</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="font-bold border-[#CFF1D2] gap-1"><Download className="w-4 h-4" /> Cahier complet PDF</Button>
            <Button variant="outline" className="font-bold border-[#CFF1D2] gap-1"><FileText className="w-4 h-4" /> Registre Excel</Button>
            <Button variant="outline" className="font-bold border-[#CFF1D2] gap-1"><Calendar className="w-4 h-4" /> Extraits période</Button>
          </CardContent></Card>
          <Card className="border-[#CFF1D2]"><CardContent className="pt-6 text-xs text-[#475C50]">Tous les documents portent code, version, date d'édition — modèles GED gérés par RMQ (circuit approbation).</CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display font-black text-[#0F3B27]">Nouvelle préparation — traçabilité complète (BPP)</DialogTitle><DialogDescription>Cahier coté, versionné, DLU calculée selon stabilité</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">Type</Label><select className="w-full mt-1 border border-[#CFF1D2] rounded-xl p-2 text-sm bg-white" value={typePreparation} onChange={(e:any)=> setTypePreparation(e.target.value)}><option value="magistrale">Magistrale (ordonnance)</option><option value="officinale">Officinale</option></select></div><div><Label className="text-xs font-bold">Nom *</Label><Input placeholder="Pâte à l'eau, Sirop..." value={nomPreparation} onChange={e=> setNomPreparation(e.target.value)} required /></div></div>
            <div><Label className="text-xs font-bold">Formule détaillée *</Label><Textarea rows={3} placeholder="Ingrédients exacts + qsp" value={formuleDetaillee} onChange={e=> setFormuleDetaillee(e.target.value)} required /></div>
            <div><Label className="text-xs font-bold">Matières premières lots (JSON)</Label><Textarea rows={2} placeholder='[{"matiere":"Oxyde zinc","lot":"MP-012","fournisseur":"Cooper"}]' value={matieresLots} onChange={e=> setMatieresLots(e.target.value)} className="font-mono text-xs" /><p className="text-[11px] text-[#475C50]">Sera tracé + certificat joint (glisser-déposer ci-dessous)</p></div>
            <ZoneDepot label="Joindre certificats d'analyse & photos préparation" />
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">Qté *</Label><Input placeholder="100g, 200ml" value={quantiteProduite} onChange={e=> setQuantiteProduite(e.target.value)} required /></div><div><Label className="text-xs font-bold">Conditionnement</Label><Input value={conditionnement} onChange={e=> setConditionnement(e.target.value)} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">Fab. *</Label><Input type="date" value={dateFabrication} onChange={e=> setDateFabrication(e.target.value)} required /></div><div><Label className="text-xs font-bold">DLU *</Label><Input type="date" value={dateLimiteUtilisation} onChange={e=> setDateLimiteUtilisation(e.target.value)} required /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold">Patient (magistrale)</Label><Input placeholder="Nom patient" value={patientNom} onChange={e=> setPatientNom(e.target.value)} /></div><div><Label className="text-xs font-bold">Prescripteur</Label><Input placeholder="Dr..." value={prescripteurNom} onChange={e=> setPrescripteurNom(e.target.value)} /></div></div>
            <div><Label className="text-xs font-bold">Contrôles effectués</Label><Textarea rows={2} value={controlesEffectues} onChange={e=> setControlesEffectues(e.target.value)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={()=> setDialogOuvert(false)}>Annuler</Button><Button type="submit" disabled={mutationCreer.isPending} className="bg-[#0F3B27] text-white font-bold">{mutationCreer.isPending ? "..." : "Inscrire — n° PREP auto"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
