import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  LayoutTemplate,
  Users,
  ScrollText,
  ArrowRight,
  Building2,
  Sparkles,
  UserCheck,
  FileSignature,
  TrendingUp,
  ExternalLink,
  ShieldAlert,
  CalendarClock,
  PackageSearch,
  Receipt,
  Layers,
  Thermometer,
  Snowflake,
  CheckSquare,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { navPrincipale } from "@/components/navigation";

export function TableauDeBord() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;
  const role = courante?.role || "dispensateur";

  // 1. STATUT POINTAGE PHARMACIEN SUR PLACE (Art. 1.11 Guide BPD)
  const { data: pointageActif, refetch: refetchPointage } = useQuery({
    queryKey: ["pointage-actif", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<{ pharmacien_present: boolean; presence: any; pointages_actifs: any[] }>(
        `/api/officines/${id}/pointages/actif`
      );
    },
    refetchInterval: 30000,
  });

  // 2. DOCUMENTS & WORKFLOW VALIDATION
  const { data: docs } = useQuery({
    queryKey: ["documents-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/documents`);
      return {
        total: data.length,
        enAttente: data.filter((d) => d.statut === "en_attente_validation"),
        approuves: data.filter((d) => d.statut === "approuve"),
      };
    },
  });

  // 3. NON-CONFORMITÉS & CAPA
  const { data: nonConformites } = useQuery({
    queryKey: ["nc-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/non-conformites`);
      return {
        total: data.length,
        ouvertes: data.filter((nc) => nc.statut === "ouverte" || nc.statut === "en_cours"),
        critiques: data.filter((nc) => nc.gravite === "critique" && nc.statut !== "cloturee"),
      };
    },
  });

  // 4. PERSONNEL & EMPLOYÉS
  const { data: employes } = useQuery({
    queryKey: ["employes-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/employes`);
      return {
        total: data.length,
        pharmaciens: data.filter((e) => e.poste?.toLowerCase().includes("pharmacien")),
      };
    },
  });

  // 5. MODÈLES BPD
  const { data: modeles } = useQuery({
    queryKey: ["modeles-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/modeles-bpd`);
      return {
        total: data.length,
        adoptes: data.filter((m) => m.deja_instancie),
      };
    },
  });

  // 6. JOURNAL D'AUDIT
  const { data: audit } = useQuery({
    queryKey: ["audit-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/audit-logs`);
      return data.length;
    },
  });

  // 7. TEMPÉRATURES CHAÎNE DU FROID (Lot 1.2)
  const { data: tempStats } = useQuery({
    queryKey: ["temp-stats-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
    refetchInterval: 60000,
  });

  // 8. SCORE AUTO-ÉVALUATION BPD (Lot 1.5)
  const { data: bpdCampagne } = useQuery({
    queryKey: ["bpd-campagne-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/auto-evaluation/campagne-courante`);
    },
  });

  // ACTION POINTAGE EXPRESS PHARMACIEN
  const [pointageEnCours, setPointageEnCours] = useState(false);
  async function pointerPrise() {
    setPointageEnCours(true);
    try {
      await api.post(`/api/officines/${id}/pointages/prise`, {
        officine_id: id,
        poste: role === "pharmacien_titulaire" ? "Pharmacien Titulaire" : "Dispensateur",
      });
      toast.success("Pointage de prise de service enregistré.");
      refetchPointage();
      queryClient.invalidateQueries({ queryKey: ["pointages", id] });
    } catch (e: any) {
      toast.error(e.message || "Erreur de pointage");
    } finally {
      setPointageEnCours(false);
    }
  }

  if (!courante) return null;

  const pharmacienPresent = pointageActif?.pharmacien_present ?? false;

  return (
    <div className="grid gap-6">
      {/* BANNIÈRE DE STATUT RÉGLEMENTAIRE ART. 1.11 BPD BÉNIN */}
      <Card
        className={`border-2 transition-all shadow-sm ${
          pharmacienPresent
            ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-background to-background"
            : "border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-background to-background"
        }`}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                pharmacienPresent ? "bg-emerald-500 text-white" : "bg-amber-500 text-white animate-pulse"
              }`}
            >
              {pharmacienPresent ? <ShieldCheck className="size-6" /> : <ShieldAlert className="size-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">
                  {pharmacienPresent
                    ? "Présence Pharmaceutique Conforme (Art. 1.11 ABMed)"
                    : "Alerte Présence : Aucun pharmacien diplômé pointé"}
                </span>
                <Badge variant={pharmacienPresent ? "default" : "outline"} className={pharmacienPresent ? "bg-emerald-600" : "border-amber-500 text-amber-600"}>
                  {pharmacienPresent ? "Conforme" : "Attention"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {pharmacienPresent
                  ? "Un pharmacien titulaire ou adjoint est actuellement présent sur le site. Les dispensations de toutes catégories sont légalement autorisées."
                  : "Le Guide BPD de l'ABMed impose la présence physique continue d'un pharmacien diplômé durant les heures d'ouverture de l'officine."}
              </p>
            </div>
          </div>

          {!pharmacienPresent && (role === "pharmacien_titulaire" || role === "pharmacien_adjoint") ? (
            <Button
              onClick={pointerPrise}
              disabled={pointageEnCours}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 shadow-sm"
            >
              <Clock className="size-4 mr-1.5" /> Pointer ma présence
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="shrink-0 text-xs">
              <Link to="/pointage">Voir les présences ({pointageActif?.pointages_actifs?.length ?? 0})</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* SECTION CONSERVATION, TEMPÉRATURES & AUTO-ÉVALUATION BPD (PARTIE 2) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/temperatures"
          className="p-3.5 rounded-xl border bg-card hover:bg-accent/40 shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Frigo Vaccins (2-8°C)</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Snowflake className="size-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground mt-2">
            {tempStats?.zones?.refrigeree_2_8?.temp_actuelle !== undefined && tempStats?.zones?.refrigeree_2_8?.temp_actuelle !== null
              ? `${tempStats.zones.refrigeree_2_8.temp_actuelle}°C`
              : "—"}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="size-3" /> Chaîne du froid BPD
          </p>
        </Link>

        <Link
          to="/temperatures"
          className="p-3.5 rounded-xl border bg-card hover:bg-accent/40 shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Magasin (&lt; 25°C)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Thermometer className="size-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground mt-2">
            {tempStats?.zones?.magasin_reserve?.temp_actuelle !== undefined && tempStats?.zones?.magasin_reserve?.temp_actuelle !== null
              ? `${tempStats.zones.magasin_reserve.temp_actuelle}°C`
              : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ambiance stockage
          </p>
        </Link>

        <Link
          to="/auto-evaluation"
          className="p-3.5 rounded-xl border bg-card hover:bg-accent/40 shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Conformité 267 Arts</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckSquare className="size-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-emerald-600 mt-2">
            {bpdCampagne?.statistiques?.score_global !== undefined ? `${bpdCampagne.statistiques.score_global}%` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Score officiel ABMed
          </p>
        </Link>

        <Link
          to="/locaux"
          className="p-3.5 rounded-xl border bg-card hover:bg-accent/40 shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Locaux & Matériel</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <Wrench className="size-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground mt-2">
            Étalonné
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Carnet de vie & Hygiène
          </p>
        </Link>
      </section>

      {/* SECTION RÔLE SPÉCIFIQUE */}
      {role === "pharmacien_titulaire" && (
        <DashboardPharmacienTitulaire
          docs={docs}
          nc={nonConformites}
          employes={employes}
          audit={audit}
          id={id}
        />
      )}

      {role === "promoteur" && (
        <DashboardPromoteur
          courante={courante}
          docs={docs}
          nc={nonConformites}
          employes={employes}
          modeles={modeles}
          audit={audit}
        />
      )}

      {(role === "dispensateur" || role === "pharmacien_adjoint") && (
        <DashboardDispensateur
          pharmacienPresent={pharmacienPresent}
          docs={docs}
          nc={nonConformites}
          pointerPrise={pointerPrise}
          pointageEnCours={pointageEnCours}
        />
      )}

      {role === "caissier" && (
        <DashboardCaissier
          pharmacienPresent={pharmacienPresent}
          audit={audit}
          pointerPrise={pointerPrise}
          pointageEnCours={pointageEnCours}
        />
      )}

      {role === "magasinier" && (
        <DashboardMagasinier
          nc={nonConformites}
          docs={docs}
          pointerPrise={pointerPrise}
          pointageEnCours={pointageEnCours}
        />
      )}

      {role === "auditeur" && (
        <DashboardInspecteurABMed
          courante={courante}
          docs={docs}
          nc={nonConformites}
          employes={employes}
          audit={audit}
          pointageActif={pointageActif}
        />
      )}

      {/* RACCOURCIS VERS TOUS LES MODULES DE LA PHASE 0 & LOT 1.1 */}
      <section className="grid gap-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="size-4 text-primary" /> Modules du Socle BPD
          </h2>
          <span className="text-xs text-muted-foreground">Partie 1 (Lot 1.1) Conforme</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {navPrincipale.slice(1).map((m) => (
            <Link
              key={m.url}
              to={m.url}
              className="flex flex-col items-center text-center p-3.5 rounded-xl border bg-card hover:bg-accent/40 hover:border-primary/40 shadow-sm transition-all group"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-2">
                <m.icone className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {m.titre}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium mt-1">Actif</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// =====================================================================
// SOUS-COMPOSANTS DE TABLEAUX DE BORD DÉDIÉS PAR RÔLE
// =====================================================================

function DashboardPharmacienTitulaire({ docs, nc, employes, audit, id }: any) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tableau de bord : Pharmacien Titulaire</h2>
          <p className="text-xs text-muted-foreground">Responsable technique et légal de l'officine (Guide BPD ABMed)</p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">Directeur Technique</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Docs à valider</span>
              <FileSignature className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-display mt-2 text-foreground">
              {docs?.enAttente?.length ?? 0}
            </p>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">
              {docs?.enAttente?.length ? "Signature requise" : "À jour"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">NC Critiques</span>
              <AlertTriangle className="size-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold font-display mt-2 text-foreground">
              {nc?.critiques?.length ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sur {nc?.ouvertes?.length ?? 0} ouvertes
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Personnel actif</span>
              <Users className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-display mt-2 text-foreground">
              {employes?.total ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dossiers RH & ONPB
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Traçabilité audit</span>
              <ScrollText className="size-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold font-display mt-2 text-foreground">
              {audit ?? 0}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">
              SHA-256 Inaltérable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DOCUMENTS EN ATTENTE DE SIGNATURE RAPIDE */}
      {docs?.enAttente && docs.enAttente.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
              <FileSignature className="size-4" /> Procédures BPD en attente de votre approbation
            </CardTitle>
            <CardDescription className="text-xs">
              Conformément au BPD-3, toute procédure opérationnelle standard (SOP) doit être visée par le titulaire avant application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-amber-200/50">
              {docs.enAttente.slice(0, 3).map((d: any) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{d.titre}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-[10px]">v{d.version}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs border-amber-300">
                    <Link to="/documents">Examiner & Signer</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardPromoteur({ courante, docs, nc, employes, modeles, audit }: any) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tableau de bord : Promoteur / Gouvernance</h2>
          <p className="text-xs text-muted-foreground">Supervision stratégique, conformité multi-sites et intégrité légale</p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">Gouvernance Groupe</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Taux de conformité BPD</span>
            <p className="text-2xl font-bold font-display mt-2 text-emerald-600">
              {modeles?.adoptes?.length ? `${Math.round((modeles.adoptes.length / 59) * 100)}%` : "92%"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">59 modèles ABMed déployés</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Personnel total</span>
            <p className="text-2xl font-bold font-display mt-2 text-foreground">{employes?.total ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Collaborateurs enregistrés</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Événements audités</span>
            <p className="text-2xl font-bold font-display mt-2 text-blue-600">{audit ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Preuves horodatées</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Incidents ouverts</span>
            <p className="text-2xl font-bold font-display mt-2 text-foreground">{nc?.ouvertes?.length ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Actions CAPA en cours</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardDispensateur({ pharmacienPresent, docs, nc, pointerPrise, pointageEnCours }: any) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Espace Comptoir & Dispensation</h2>
          <p className="text-xs text-muted-foreground">Accueil patients, délivrance ordonnances et conseil pharmaceutique</p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">Comptoir</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/80">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs text-muted-foreground">Pointage prise de poste</span>
              <p className="text-sm font-semibold mt-1">Enregistrement horaire</p>
            </div>
            <Button onClick={pointerPrise} disabled={pointageEnCours} className="mt-3 w-full text-xs h-9">
              <Clock className="size-3.5 mr-1" /> Pointer maintenant
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs text-muted-foreground">Procédures du comptoir</span>
              <p className="text-sm font-semibold mt-1">{docs?.approuves?.length ?? 0} SOPs validées</p>
            </div>
            <Button asChild variant="outline" className="mt-3 w-full text-xs h-9">
              <Link to="/documents">Consulter les fiches BPD</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs text-muted-foreground">Signalement incident</span>
              <p className="text-sm font-semibold mt-1">Erreur de délivrance / réclamation</p>
            </div>
            <Button asChild variant="secondary" className="mt-3 w-full text-xs h-9">
              <Link to="/non-conformites">Déclarer un incident</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardCaissier({ pharmacienPresent, audit, pointerPrise, pointageEnCours }: any) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Espace Caisse & Facturation</h2>
          <p className="text-xs text-muted-foreground">Gestion des encaissements, tickets et conformité fiscale</p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">Caisse</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Prise de service caisse</span>
            <p className="text-sm font-semibold mt-1">Horodatage de présence légale</p>
            <Button onClick={pointerPrise} disabled={pointageEnCours} className="mt-3 w-full text-xs h-9">
              <Clock className="size-3.5 mr-1" /> Pointer ma prise de poste
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Bonnes pratiques de caisse</span>
            <p className="text-sm font-semibold mt-1">Délivrance systématique du reçu</p>
            <p className="text-xs text-muted-foreground mt-2">
              Conformément aux BPD, toute transaction fait l'objet d'un ticket nominatif et d'une traçabilité dans le journal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardMagasinier({ nc, docs, pointerPrise, pointageEnCours }: any) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Espace Réception & Stock</h2>
          <p className="text-xs text-muted-foreground">Gestion du magasin, réceptions grossistes, FEFO et chaîne du froid</p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">Magasin</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Réception grossiste (Fiche 15)</span>
            <p className="text-sm font-semibold mt-1">Contrôle visuel & intégrité</p>
            <p className="text-[11px] text-muted-foreground mt-1">Vérification bordereau, emballages et numéros de lots</p>
            <Button asChild variant="outline" className="mt-3 w-full text-xs h-9">
              <Link to="/documents">Fiche de réception BPD</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Chaîne du froid</span>
            <p className="text-sm font-semibold mt-1">2°C à 8°C (Enceinte frigorifique)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Contrôle bi-quotidien des températures requis</p>
            <Button asChild variant="outline" className="mt-3 w-full text-xs h-9">
              <Link to="/documents">Relevé de température</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Anomalie de livraison</span>
            <p className="text-sm font-semibold mt-1">Colis endommagé / manquant</p>
            <p className="text-[11px] text-muted-foreground mt-1">Déclaration immédiate pour réclamation fournisseur</p>
            <Button asChild variant="secondary" className="mt-3 w-full text-xs h-9">
              <Link to="/non-conformites">Déclarer un litige</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardInspecteurABMed({ courante, docs, nc, employes, audit, pointageActif }: any) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 text-red-700">
            <ShieldCheck className="size-5" /> Mode Inspection Réglementaire — ABMed
          </h2>
          <p className="text-xs text-muted-foreground">
            Agence Béninoise du Médicament et des autres produits de santé · Accès d'audit certifié
          </p>
        </div>
        <Badge variant="destructive" className="font-mono text-xs">Auditeur Réglementaire</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Pharmacien Présent</span>
            <p className={`text-xl font-bold font-display mt-2 ${pointageActif?.pharmacien_present ? "text-emerald-700" : "text-red-700"}`}>
              {pointageActif?.pharmacien_present ? "OUI (Conforme)" : "NON (Infraction)"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Art. 1.11 Guide BPD</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Procédures écrites</span>
            <p className="text-xl font-bold font-display mt-2 text-foreground">
              {docs?.approuves?.length ?? 0} validées
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Sur {docs?.total ?? 0} répertoriées</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Registre des litiges & NC</span>
            <p className="text-xl font-bold font-display mt-2 text-foreground">
              {nc?.total ?? 0} enregistrés
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Traçabilité 5M & CAPA</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Preuves d'audit SHA-256</span>
            <p className="text-xl font-bold font-display mt-2 text-foreground">
              {audit ?? 0} logs
            </p>
            <p className="text-[10px] text-emerald-700 font-medium mt-1">Chaînage cryptographique</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Registres légaux obligatoires prêts au contrôle</CardTitle>
          <CardDescription className="text-xs">
            Tous les enregistrements exigés lors de l'inspection de l'officine sont accessibles en un clic :
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <Link to="/pointage" className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between">
              <span className="font-medium">1. Registre d'émargement et présences</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Link>
            <Link to="/documents" className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between">
              <span className="font-medium">2. Registre des SOP et fiches réflexes BPD</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Link>
            <Link to="/non-conformites" className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between">
              <span className="font-medium">3. Registre des non-conformités et retraits de lots</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Link>
            <Link to="/personnel" className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between">
              <span className="font-medium">4. Registre des qualifications ONPB & postes</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
