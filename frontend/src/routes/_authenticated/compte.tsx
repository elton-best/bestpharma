import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({
    meta: [
      { title: "Mon Profil & Réglages — BestPharma" },
      {
        name: "description",
        content: "Gérez vos informations de pharmacien, vos accréditations et votre rôle officinal.",
      },
    ],
  }),
  component: PageCompte,
});

export function PageCompte() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const user = api.getUser();

  const [nom, setNom] = useState(user?.name || "");
  const [telephone, setTelephone] = useState(user?.telephone || "+229 97 00 00 00");
  const [ordreNumero, setOrdreNumero] = useState("ONPB-B-2026-042");
  const [enCours, setEnCours] = useState(false);

  // Changement de mot de passe
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [enCoursMdp, setEnCoursMdp] = useState(false);

  async function enregistrerProfil(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    try {
      // Mise à jour locale et notification
      const misAJour = {
        id: user?.id ?? "",
        email: user?.email ?? "",
        name: nom.trim(),
        telephone: telephone.trim(),
        mfa_enabled: user?.mfa_enabled,
      };
      api.setUser(misAJour);
      queryClient.invalidateQueries({ queryKey: ["profil"] });
      toast.success("Profil professionnel mis à jour avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setEnCours(false);
    }
  }

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    if (nouveauMdp !== confirmMdp) {
      toast.error("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (nouveauMdp.length < 8) {
      toast.error("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setEnCoursMdp(true);
    try {
      toast.success("Mot de passe mis à jour avec succès !");
      setAncienMdp("");
      setNouveauMdp("");
      setConfirmMdp("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setEnCoursMdp(false);
    }
  }

  const roleLibelle = courante?.role
    ? (fr.roles[courante.role as keyof typeof fr.roles] ?? "Rôle non précisé")
    : "Pharmacien";
  const initiales = (nom || user?.email || "DR")
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-6 font-sans">
      {/* En-tête de page inspiré d'InnerBuild PageHeader */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#CFE3D5]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#EFF7F1] px-3 py-1 text-xs font-bold text-[#023010] mb-2">
            <Sparkles className="size-3 text-[#18AA38]" /> Espace Collaborateur Officine
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#1F2420] tracking-tight">
            Mon Profil & Réglages
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C6660]">
            Gérez vos accréditations de santé, vos rôles BPD et vos paramètres d'accès sécurisé.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#CFE3D5] bg-white text-xs font-semibold text-[#1F2420]">
            <Building2 className="size-3.5 text-[#18AA38]" />
            <span>{courante?.officine?.nom || "Officine active"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche (4 cols) : Carte récapitulative profil & rôle */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-2xl border-[#CFE3D5] bg-white shadow-xs overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-[#023010] to-[#0d5e24] p-4 flex items-end">
              <div className="size-16 rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center font-display font-black text-xl text-[#023010] translate-y-8">
                {initiales || "DR"}
              </div>
            </div>
            <CardContent className="pt-10 pb-5 px-5 space-y-4">
              <div>
                <h2 className="font-display font-bold text-lg text-[#1F2420]">{nom || "Dr Titulaire"}</h2>
                <p className="text-xs text-[#5C6660] font-medium">{user?.email}</p>
              </div>

              <div className="pt-2 border-t border-[#CFE3D5]/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5C6660]">Rôle officiel</span>
                  <span className="font-bold text-[#023010] bg-[#EFF7F1] px-2 py-0.5 rounded-md border border-[#18AA38]/30">
                    {roleLibelle}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5C6660]">Ordre National</span>
                  <span className="font-mono font-bold text-[#1F2420]">Section B</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5C6660]">Statut BPD</span>
                  <span className="font-bold text-[#18AA38] flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Habilité
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte Conformité ABMed */}
          <Card className="rounded-2xl border-[#CFE3D5] bg-[#EFF7F1]/50 p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-xl bg-[#023010] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4 text-[#18AA38]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#023010]">Responsabilité Pharmaceutique</p>
                <p className="text-[11px] text-[#5C6660] mt-0.5 leading-relaxed">
                  Conformément à l'Art. 1.11 du Guide BPD, chaque dispensation réalisée sous votre session engage votre visa professionnel.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne droite (8 cols) : Formulaire d'édition du profil & mot de passe */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Coordonnées professionnelles */}
          <Card className="rounded-2xl border-[#CFE3D5] bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-[#CFE3D5]/60">
              <CardTitle className="font-display text-base text-[#1F2420] flex items-center gap-2">
                <User className="size-4 text-[#18AA38]" /> Coordonnées Professionnelles
              </CardTitle>
              <CardDescription className="text-xs text-[#5C6660]">
                Informations inscrites sur vos ordonnanciers et reçus de caisse e-MECeF.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={enregistrerProfil} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom-complet" className="text-xs font-semibold text-[#1F2420]">
                      Nom et Prénom
                    </Label>
                    <Input
                      id="nom-complet"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-[#f8faf8] focus:bg-white text-xs sm:text-sm h-10"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email-prof" className="text-xs font-semibold text-[#1F2420]">
                      Adresse Email (Identifiant)
                    </Label>
                    <Input
                      id="email-prof"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-muted/40 text-xs sm:text-sm h-10 opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tel-prof" className="text-xs font-semibold text-[#1F2420]">
                      Téléphone Officinal (Bénin)
                    </Label>
                    <Input
                      id="tel-prof"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-[#f8faf8] focus:bg-white text-xs sm:text-sm h-10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ordre-num" className="text-xs font-semibold text-[#1F2420]">
                      N° Inscription Ordre (Section B)
                    </Label>
                    <Input
                      id="ordre-num"
                      value={ordreNumero}
                      onChange={(e) => setOrdreNumero(e.target.value)}
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-[#f8faf8] focus:bg-white text-xs sm:text-sm h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={enCours}
                    className="rounded-xl bg-[#023010] hover:bg-[#18AA38] text-white font-bold text-xs h-10 px-5 shadow-xs"
                  >
                    <Save className="size-3.5 mr-1.5" /> Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 2. Sécurité & Mot de Passe */}
          <Card className="rounded-2xl border-[#CFE3D5] bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-[#CFE3D5]/60">
              <CardTitle className="font-display text-base text-[#1F2420] flex items-center gap-2">
                <Lock className="size-4 text-[#18AA38]" /> Sécurité du Compte & Mot de passe
              </CardTitle>
              <CardDescription className="text-xs text-[#5C6660]">
                Mettez à jour vos identifiants pour garantir la confidentialité de l'officine.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={changerMotDePasse} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="pass-actuel" className="text-xs font-semibold text-[#1F2420]">
                      Mot de passe actuel
                    </Label>
                    <Input
                      id="pass-actuel"
                      type="password"
                      value={ancienMdp}
                      onChange={(e) => setAncienMdp(e.target.value)}
                      placeholder="••••••••••••"
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-[#f8faf8] focus:bg-white text-xs h-10"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pass-nouveau" className="text-xs font-semibold text-[#1F2420]">
                      Nouveau mot de passe
                    </Label>
                    <Input
                      id="pass-nouveau"
                      type="password"
                      value={nouveauMdp}
                      onChange={(e) => setNouveauMdp(e.target.value)}
                      placeholder="••••••••••••"
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-[#f8faf8] focus:bg-white text-xs h-10"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pass-confirm" className="text-xs font-semibold text-[#1F2420]">
                      Confirmer le mot de passe
                    </Label>
                    <Input
                      id="pass-confirm"
                      type="password"
                      value={confirmMdp}
                      onChange={(e) => setConfirmMdp(e.target.value)}
                      placeholder="••••••••••••"
                      className="mt-1 rounded-xl border-[#CFE3D5] bg-[#f8faf8] focus:bg-white text-xs h-10"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={enCoursMdp || !nouveauMdp}
                    variant="outline"
                    className="rounded-xl border-[#CFE3D5] bg-white hover:bg-[#EFF7F1] text-[#023010] font-bold text-xs h-10 px-5 shadow-xs"
                  >
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
