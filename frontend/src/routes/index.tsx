import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Award,
  ArrowRight,
  PlusCircle,
  Building2,
  Lock,
  Sparkles,
  Thermometer,
  Layers,
  Receipt,
  BookOpenCheck,
  ShieldAlert,
  ChevronRight,
  Activity,
  Check,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

export function LandingPage() {
  const [compact, setCompact] = useState(false);
  const user = api.getUser();
  const token = api.getToken();

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faf8] text-[#1F2420] font-sans flex flex-col selection:bg-[#18AA38]/20 selection:text-[#023010]">
      {/* ============================================================== */}
      {/* 1. NAVBAR FLOTTANTE STYLE INNERBUILD                           */}
      {/* ============================================================== */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-300 md:px-6 md:pt-4">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border transition-all duration-300 ${
            compact
              ? "border-[#CFE3D5] bg-white/95 px-4 py-2.5 shadow-md shadow-[#023010]/5 backdrop-blur-md"
              : "border-[#CFE3D5]/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-sm"
          }`}
        >
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none group">
            <div className="size-9 rounded-xl bg-[#023010] flex items-center justify-center text-white font-display font-extrabold text-lg shadow-sm transition-transform group-hover:scale-105">
              +
            </div>
            <div>
              <span className="font-display font-black text-lg text-[#023010] tracking-tight">
                BESTPHARMA
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-[#5C6660] ml-2 border-l border-[#CFE3D5] pl-2">
                Bénin · ABMed BPD
              </span>
            </div>
          </Link>

          {/* Navigation desktop */}
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-1 rounded-full border border-[#CFE3D5] bg-[#EFF7F1]/80 p-1 md:flex"
          >
            <a
              href="#piliers"
              className="flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-bold text-[#1F2420] transition-colors hover:text-[#023010] hover:bg-[#E2F7E7]"
            >
              Les 4 Piliers
            </a>
            <a
              href="#modules"
              className="flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] border border-[#0F3B27]/20 transition-colors hover:bg-[#92FF5F]"
            >
              Les 16 Modules BPD
            </a>
            <a
              href="#reglementation"
              className="flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-bold text-[#1F2420] transition-colors hover:text-[#023010] hover:bg-[#E2F7E7]"
            >
              Conformité 267 Art.
            </a>
            <a
              href="#caisse"
              className="flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-bold text-[#1F2420] transition-colors hover:text-[#023010] hover:bg-[#E2F7E7]"
            >
              Caisse e-MECeF
            </a>
            <a
              href="#comptabilite"
              className="flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-bold text-[#1F2420] transition-colors hover:text-[#023010] hover:bg-[#E2F7E7]"
            >
              SYSCOHADA
            </a>
          </nav>

          {/* Actions Droite */}
          <div className="flex items-center gap-2.5">
            {token && user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#023010] hover:bg-[#18AA38] px-4 py-2 font-display text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px"
              >
                Accéder à l'officine
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-xs font-bold text-[#1F2420] hover:text-[#023010] transition px-3 py-1.5 rounded-lg hover:bg-[#EFF7F1]"
                >
                  Connexion
                </Link>
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#023010] hover:bg-[#18AA38] px-4 py-2 font-display text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px"
                >
                  <PlusCircle className="size-3.5" />
                  <span>Ouvrir une officine</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION STYLE INNERBUILD                               */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-28 sm:pt-36 pb-16 md:pb-24 px-4 sm:px-6">
        {/* Glow ambient background */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-br from-[#18AA38]/15 via-[#023010]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Badge Pill officiel ABMed */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE3D5] bg-white px-4 py-1.5 text-xs font-bold text-[#023010] shadow-sm mb-6">
            <span className="size-2 rounded-full bg-[#18AA38] animate-pulse" />
            <span className="font-mono text-[#18AA38]">BÉGPHARMA 2026</span>
            <span className="text-[#CFE3D5]">|</span>
            <span>Décision n°137/MS/DC/SGM/ABMed/DAF/DPLR</span>
          </div>

          {/* Titre Principal */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1F2420] leading-[1.12] max-w-4xl mx-auto">
            La solution numérique d'élite pour les{" "}
            <span className="text-[#023010] underline decoration-[#18AA38] decoration-4 underline-offset-4">
              officines de pharmacie
            </span>{" "}
            au Bénin
          </h1>

          {/* Sous-titre */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-[#5C6660] font-medium">
            Digitalisez votre officine de A à Z : conformité rigoureuse aux 267 articles du Guide BPD, traçabilité inaltérable sans double validation bloquante, caisse tactile e-MECeF et comptabilité SYSCOHADA.
          </p>

          {/* Call-to-actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/inscription"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#023010] hover:bg-[#18AA38] px-6 py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-[#023010]/15 transition-all hover:-translate-y-0.5"
            >
              Ouvrir mon officine gratuitement
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#CFE3D5] bg-white hover:bg-[#EFF7F1] px-6 py-3.5 font-display text-sm font-bold text-[#023010] shadow-sm transition-all hover:-translate-y-0.5"
            >
              <Lock className="size-4 text-[#18AA38]" />
              Connexion directe par rôle
            </Link>
          </div>

          {/* Checkmarks de réassurance */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-[#5C6660]">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[#18AA38] stroke-[2.5]" />
              Sans double opt-in ni code SMS bloquant
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[#18AA38] stroke-[2.5]" />
              59 modèles types BPD préchargés
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[#18AA38] stroke-[2.5]" />
              Facturation e-MECeF certifiée DGI Bénin
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[#18AA38] stroke-[2.5]" />
              Fonctionnement POS hors-ligne garanti
            </span>
          </div>

          {/* Métriques / Mini dashboard bar */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[#CFE3D5] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="font-display text-2xl sm:text-3xl font-black text-[#023010]">267</p>
              <p className="text-xs font-bold text-[#1F2420] mt-1">Articles BPD ABMed</p>
              <p className="text-[11px] text-[#5C6660]">Mise en conformité intégrale</p>
            </div>
            <div className="rounded-2xl border border-[#CFE3D5] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="font-display text-2xl sm:text-3xl font-black text-[#18AA38]">100%</p>
              <p className="text-xs font-bold text-[#1F2420] mt-1">Traçabilité Inaltérable</p>
              <p className="text-[11px] text-[#5C6660]">Chaîne de hachage SHA-256</p>
            </div>
            <div className="rounded-2xl border border-[#CFE3D5] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="font-display text-2xl sm:text-3xl font-black text-[#023010]">Art. 1.11</p>
              <p className="text-xs font-bold text-[#1F2420] mt-1">Présence Pharmacien</p>
              <p className="text-[11px] text-[#5C6660]">Pointage obligatoire sur site</p>
            </div>
            <div className="rounded-2xl border border-[#CFE3D5] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="font-display text-2xl sm:text-3xl font-black text-[#18AA38]">e-MECeF</p>
              <p className="text-xs font-bold text-[#1F2420] mt-1">DGI Bénin & POS</p>
              <p className="text-[11px] text-[#5C6660]">Mobile Money Mobile Money & OHADA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. LES 4 PILIERS DE L'OFFICINE BÉGPHARMA                       */}
      {/* ============================================================== */}
      <section id="piliers" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#EFF7F1] px-3.5 py-1 text-xs font-bold text-[#023010] mb-3">
            <Sparkles className="size-3 text-[#18AA38]" /> Les 4 Piliers Fondamentaux
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#1F2420] tracking-tight">
            Une architecture conçue pour l'exigence de la santé publique
          </h2>
          <p className="text-xs sm:text-sm text-[#5C6660] mt-2">
            De la réception du colis grossiste jusqu'au bilan comptable annuel, tout le flux officinal est sous contrôle.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pilier 1 */}
          <div className="rounded-3xl border border-[#CFE3D5] bg-white p-6 sm:p-8 shadow-sm hover:border-[#18AA38]/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-[#EFF7F1] border border-[#CFE3D5] flex items-center justify-center text-[#023010]">
                <ShieldCheck className="size-6 text-[#18AA38]" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18AA38] uppercase">Pilier 1 · Qualité BPD</span>
                <h3 className="font-display text-lg font-bold text-[#1F2420]">
                  Gouvernance, GED & Traçabilité Inaltérable
                </h3>
              </div>
            </div>
            <p className="text-xs text-[#5C6660] leading-relaxed mb-4">
              Conformité stricte aux exigences de l'ABMed. Respect absolu de l'obligation de présence effective du Pharmacien Titulaire (Art. 1.11) avec pointage géolocalisé.
            </p>
            <ul className="space-y-2 text-xs text-[#1F2420] font-medium border-t border-[#CFE3D5]/60 pt-4">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>59 modèles documentaires BPD officiels préchargés (BPD-DOC-001 à 059)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Chaîne d'audit trail SHA-256 inaltérable & interdiction de suppression</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Gestion des non-conformités CAPA et analyse des causes 5M</span>
              </li>
            </ul>
          </div>

          {/* Pilier 2 */}
          <div className="rounded-3xl border border-[#CFE3D5] bg-white p-6 sm:p-8 shadow-sm hover:border-[#18AA38]/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-[#EFF7F1] border border-[#CFE3D5] flex items-center justify-center text-[#023010]">
                <Thermometer className="size-6 text-[#18AA38]" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18AA38] uppercase">Pilier 2 · Chaîne du Froid</span>
                <h3 className="font-display text-lg font-bold text-[#1F2420]">
                  Surveillance Thermique & Métrologie IoT
                </h3>
              </div>
            </div>
            <p className="text-xs text-[#5C6660] leading-relaxed mb-4">
              Suivi bi-quotidien obligatoire des enceintes frigorifiques (2°C à 8°C) et de la température ambiante de stockage (&lt; 25°C et humidité &lt; 65%).
            </p>
            <ul className="space-y-2 text-xs text-[#1F2420] font-medium border-t border-[#CFE3D5]/60 pt-4">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Relevés automatiques et manuels avec alerte immédiate de rupture</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Registre d'étalonnage et maintenance préventive des sondes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Plan d'urgence groupe électrogène / transfert d'urgence de vaccins</span>
              </li>
            </ul>
          </div>

          {/* Pilier 3 */}
          <div className="rounded-3xl border border-[#CFE3D5] bg-white p-6 sm:p-8 shadow-sm hover:border-[#18AA38]/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-[#EFF7F1] border border-[#CFE3D5] flex items-center justify-center text-[#023010]">
                <Layers className="size-6 text-[#18AA38]" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18AA38] uppercase">Pilier 3 · Stock & Stupéfiants</span>
                <h3 className="font-display text-lg font-bold text-[#1F2420]">
                  Gestion FEFO, Préparations & Ordonnancier
                </h3>
              </div>
            </div>
            <p className="text-xs text-[#5C6660] leading-relaxed mb-4">
              Zéro péremption oubliée grâce au déstockage FEFO automatique (First Expired, First Out) et traçabilité inviolable des substances vénéneuses et stupéfiants.
            </p>
            <ul className="space-y-2 text-xs text-[#1F2420] font-medium border-t border-[#CFE3D5]/60 pt-4">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Registre officiel des stupéfiants avec balance d'entrées/sorties en temps réel</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Ordonnancier numérique coté et paraphé avec archivage 10 ans</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Fiches de fabrication de préparations magistrales & officinales</span>
              </li>
            </ul>
          </div>

          {/* Pilier 4 */}
          <div className="rounded-3xl border border-[#CFE3D5] bg-white p-6 sm:p-8 shadow-sm hover:border-[#18AA38]/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-[#EFF7F1] border border-[#CFE3D5] flex items-center justify-center text-[#023010]">
                <Receipt className="size-6 text-[#18AA38]" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18AA38] uppercase">Pilier 4 · Caisse & Finances</span>
                <h3 className="font-display text-lg font-bold text-[#1F2420]">
                  Caisse POS Tactile, e-MECeF & SYSCOHADA
                </h3>
              </div>
            </div>
            <p className="text-xs text-[#5C6660] leading-relaxed mb-4">
              Encaissement rapide au comptoir, intégration directe avec l'API e-MECeF de la DGI Bénin, paiements Mobile Money Mobile Money et génération du journal des ventes OHADA.
            </p>
            <ul className="space-y-2 text-xs text-[#1F2420] font-medium border-t border-[#CFE3D5]/60 pt-4">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Facturation normalisée DGI avec Code MECeF, NIM, QR Code fiscal</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Paiement Mobile Money (MTN MoMo, Moov Money, Celtiis Cash, Carte)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-[#18AA38] shrink-0" />
                <span>Génération des écritures comptables SYSCOHADA (Comptes 701, 443, 521, 571)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. LES 16 MODULES OFFICIELS DE L'OFFICINE BPD                  */}
      {/* ============================================================== */}
      <section id="modules" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-[#CFE3D5]/60">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0F3B27]/20 bg-[#CFF1D2] px-3.5 py-1 text-xs font-bold text-[#0F3B27] mb-3">
            <Sparkles className="size-3 text-[#0F3B27]" /> Suite Métier Complète
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0F3B27] tracking-tight">
            Les 16 Modules Opérationnels de l'Officine
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50] mt-2 leading-relaxed">
            Une suite logicielle intégrée de pointe couvrant l'intégralité du cycle pharmaceutique, conforme aux 267 articles du Guide BPD de l'ABMed.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            {
              titre: "Caisse POS Tactile",
              desc: "Vente au comptoir, e-MECeF, Mobile Money Mobile Money & clôtures Z.",
              code: "POS-01",
              icone: "Receipt",
              url: "/auth",
            },
            {
              titre: "Dispensation BPD",
              desc: "Analyse pharmaceutique, ordonnancier coté & respect de la règle FEFO.",
              code: "DISP-02",
              icone: "FileText",
              url: "/auth",
            },
            {
              titre: "Facturation DGI",
              desc: "Factures normalisées avec NIM, QR Code fiscal & compteurs officiels certifiés.",
              code: "MECeF-03",
              icone: "Award",
              url: "/auth",
            },
            {
              titre: "Stock & Règle FEFO",
              desc: "Gestion par lots, alertes péremptions à 90 jours & zone de quarantaine.",
              code: "STK-04",
              icone: "Layers",
              url: "/auth",
            },
            {
              titre: "Comptabilité OHADA",
              desc: "Journal des ventes, comptes 701/571/521 & export automatisé SYSCOHADA.",
              code: "CPT-05",
              icone: "Activity",
              url: "/auth",
            },
            {
              titre: "Registre Stupéfiants",
              desc: "Tableau B inaltérable, balance stricte sans suppression & archivage 10 ans.",
              code: "STUP-06",
              icone: "Lock",
              url: "/auth",
            },
            {
              titre: "Préparatoire & Magistrales",
              desc: "Cahier de fabrication officiel, calcul des excipients & visa du titulaire.",
              code: "PREP-07",
              icone: "PlusCircle",
              url: "/auth",
            },
            {
              titre: "Températures & Froid",
              desc: "Sondes frigo 2-8°C, réserve < 25°C et alertes d'excursion en temps réel.",
              code: "TEMP-08",
              icone: "Thermometer",
              url: "/auth",
            },
            {
              titre: "Locaux & Matériel (5M)",
              desc: "Plan de bio-nettoyage BPD4-F07, étalonnage des balances & maintenance.",
              code: "LOC-09",
              icone: "Building2",
              url: "/auth",
            },
            {
              titre: "Auto-évaluation 267 Arts",
              desc: "Grille officielle ABMed, calcul du score de conformité & génération CAPA.",
              code: "EVAL-10",
              icone: "BookOpenCheck",
              url: "/auth",
            },
            {
              titre: "Pointage Pharmacien",
              desc: "Présence obligatoire effective sur site (Art. 1.11) & badge numérique.",
              code: "PRES-11",
              icone: "Clock",
              url: "/auth",
            },
            {
              titre: "Personnel & Fiches RH",
              desc: "Qualifications, habilitations et compétences du personnel d'officine.",
              code: "RH-12",
              icone: "Users",
              url: "/auth",
            },
            {
              titre: "GED & Procédures Qualité",
              desc: "BPD-1 & BPD-3, rédaction, cycle de révision et visas du Titulaire.",
              code: "GED-13",
              icone: "FileText",
              url: "/auth",
            },
            {
              titre: "Bibliothèque 59 Modèles",
              desc: "Procédures types préchargées de l'ABMed prêtes à être instanciées.",
              code: "MOD-14",
              icone: "BookOpenCheck",
              url: "/auth",
            },
            {
              titre: "Non-conformités (5M)",
              desc: "Signalement d'incidents, analyse des causes racines & plan d'action CAPA.",
              code: "CAPA-15",
              icone: "ShieldAlert",
              url: "/auth",
            },
            {
              titre: "Échéances Réglementaires",
              desc: "Calendrier des obligations sanitaires, renouvellements et rappels officiels.",
              code: "ECH-16",
              icone: "Clock",
              url: "/auth",
            },
          ].map((m) => (
            <div
              key={m.code}
              className="p-5 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] font-bold text-[#0F3B27] bg-[#CFF1D2] px-2 py-0.5 rounded-md border border-[#0F3B27]/15">
                    {m.code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Conforme ABMed
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-[#0F3B27] group-hover:text-[#0F3B27]/80 transition-colors mb-1.5">
                  {m.titre}
                </h3>
                <p className="text-xs text-[#475C50] leading-relaxed line-clamp-2">
                  {m.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F3B27]">
                <Link
                  to={m.url}
                  className="inline-flex items-center gap-1 group-hover:text-[#0F3B27] font-bold group-hover:underline"
                >
                  Accéder &gt;
                </Link>
                <span className="size-2 rounded-full bg-[#92FF5F]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. SECTION BANNER CALL-TO-ACTION                               */}
      {/* ============================================================== */}
      <section className="px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-[#023010] via-[#03260e] to-[#011707] p-8 sm:p-12 text-white text-center relative overflow-hidden border border-[#CFE3D5]/30">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#18AA38]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#18AA38]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/40 bg-[#18AA38]/15 px-3 py-1 text-[11px] font-mono font-bold text-[#18AA38] mb-4">
              <Sparkles className="size-3.5" /> Démarrage sans contrainte
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Rejoignez l'élite officinale dès aujourd'hui
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
              Activez votre officine, connectez votre équipe et commencez à dispenser vos ordonnances en toute conformité réglementaire.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/inscription"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#18AA38] hover:bg-[#159431] px-6 py-3 font-display text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#18AA38]/25 transition-all hover:-translate-y-0.5"
              >
                Créer mon compte officine
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/15 px-6 py-3 font-display text-xs sm:text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              >
                Tester les comptes démo (1 clic)
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. FOOTER ÉPURÉ                                                */}
      {/* ============================================================== */}
      <footer className="mt-auto border-t border-[#CFE3D5] py-8 bg-white text-xs text-[#5C6660]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[#023010] flex items-center justify-center text-white font-display font-black text-xs">
              +
            </div>
            <span className="font-bold text-[#1F2420]">BestPharma Bénin</span>
            <span className="text-[#CFE3D5]">|</span>
            <span>Système d'Information Officinal conforme ABMed</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link to="/auth" className="hover:text-[#023010] transition-colors">
              Connexion
            </Link>
            <Link to="/inscription" className="hover:text-[#023010] transition-colors">
              Ouvrir une officine
            </Link>
            <Link to="/dashboard" className="hover:text-[#023010] transition-colors">
              Tableau de bord
            </Link>
          </div>

          <p className="text-[11px] text-[#5C6660]">
            © 2026 BestPharma. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
