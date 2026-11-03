import { useState, useEffect } from "react";

export type Language = "fr" | "en";

const STORAGE_KEY = "innerbuild_lang";

export const translations = {
  fr: {
    // Nav
    nav_home: "Accueil",
    nav_challenges: "Challenges",
    nav_results: "Résultats",
    nav_aifactory: "Formation AI Factory",
    nav_method: "Méthode",
    nav_login: "Se connecter",
    nav_join: "Rejoindre l'élite",
    nav_jury: "Accès Jury",

    // InnerBuild Hero
    ib_tag: "The InnerBuild · Engineering & Forge de Builders",
    ib_hero_title: "On ne forme pas des développeurs.",
    ib_hero_subtitle: "On forge des Frontend Killers.",
    ib_hero_desc:
      "Des challenges intensifs sur de vrais clients, jugés par un collège d'experts indépendants à 7 dimensions. Pas de promesses creuses : du code en production, des audits réels et des preuves de compétence vérifiables.",
    ib_cta_challenges: "Voir les Challenges",
    ib_cta_formation: "Découvrir la Formation AI Factory",
    ib_stat_saisons: "Saisons Réalisées",
    ib_stat_inbuilders: "Inbuilders Forgés",
    ib_stat_jurys: "Jurys Spécialisés",
    ib_stat_live: "Projets Shippés en Prod",

    // InnerBuild Pillars
    ib_pillar_1_title: "Clients Réels & Vrais Briefs",
    ib_pillar_1_desc: "Chaque saison confronte les participants à des marques réelles (ex: BenDjo) avec contraintes réelles, livrables sous pression et flux complets.",
    ib_pillar_2_title: "Jury Indépendant à 7 Dimensions",
    ib_pillar_2_desc: "Développement TypeScript, Branding & DA, Marketing, Communication quotidienne, Acquisition, Business et SEO & Performance.",
    ib_pillar_3_title: "Formation Propulsée : AI Factory",
    ib_pillar_3_desc: "212 skills IA curés, architectures d'agents et studio de pratique pour délivrer de bout en bout sans friction.",

    // Challenges Page
    ch_tag: "The InnerBuild · Saisons Officielles",
    ch_title: "Challenges & Hackathons",
    ch_desc: "Relevez des défis en conditions réelles, shippez des projets sous pression et obtenez des retours complets de professionnels.",
    ch_filter_all: "Tous les challenges",
    ch_filter_active: "En cours / Évaluation",
    ch_filter_completed: "Terminés",
    ch_deadline: "Date limite de soumission",
    ch_starts: "Démarrage",
    ch_fee: "Frais d'accès",
    ch_free: "Gratuit",
    ch_days: "Jours",
    ch_status_completed: "Terminé",
    ch_status_active: "En cours",
    ch_status_eval: "Évaluation du jury",
    ch_countdown_days: "j",
    ch_countdown_hours: "h",
    ch_countdown_mins: "m",
    ch_countdown_secs: "s",
    ch_view_results: "Consulter les Résultats",
    ch_join_now: "Participer au Challenge",

    // Results Page
    res_tag: "The InnerBuild · Palmarès & Registre Officiel",
    res_title: "Résultats & Classements",
    res_desc: "Délibérations officielles, scores certifiés et classements des participants évalués par le jury indépendant.",
    res_rank: "Rang",
    res_participant: "Participant",
    res_project: "Projet / Titre",
    res_score: "Score Final",
    res_link: "Lien Live",
    res_view_details: "Voir les dimensions",
    res_podium_gold: "1ère Place · Vainqueur",
    res_podium_silver: "2ème Place",
    res_podium_bronze: "3ème Place",
    res_eval_dimensions: "Évaluations du Jury par Dimension",

    // Auth
    auth_title_signin: "Connexion The InnerBuild",
    auth_title_signup: "Créer un compte The InnerBuild",
    auth_desc_signin: "Accédez à votre espace inbuilder, vos formations et vos challenges.",
    auth_desc_signup: "Rejoignez la forge d'excellence et profitez des réductions partenaires.",
    auth_email: "Adresse email",
    auth_password: "Mot de passe",
    auth_name: "Nom complet",
    auth_btn_signin: "Se connecter",
    auth_btn_signup: "Créer mon compte",
    auth_switch_to_up: "Pas encore de compte ? S'inscrire",
    auth_switch_to_in: "Déjà inscrit ? Se connecter",
    auth_partner_badge: "Partenariats actifs : BWT & 4Talents (-50% appliqués automatiquement)",

    // Jury
    jury_login_title: "Accès Privé Jury",
    jury_login_desc: "Saisissez votre code d'accès juré officiel pour évaluer les soumissions.",
    jury_code_label: "Code d'accès jury (reçu par email)",
    jury_btn_enter: "Accéder à l'espace d'évaluation",
  },
  en: {
    // Nav
    nav_home: "Home",
    nav_challenges: "Challenges",
    nav_results: "Results",
    nav_aifactory: "AI Factory Training",
    nav_method: "Method",
    nav_login: "Sign In",
    nav_join: "Join the Elite",
    nav_jury: "Jury Access",

    // InnerBuild Hero
    ib_tag: "The InnerBuild · Engineering & Builders Forge",
    ib_hero_title: "We don't train developers.",
    ib_hero_subtitle: "We forge Frontend Killers.",
    ib_hero_desc:
      "Intensive challenges with real clients, audited by an independent 7-dimension expert jury. No empty promises: production code, real audits, and verifiable proof of competence.",
    ib_cta_challenges: "Explore Challenges",
    ib_cta_formation: "Discover AI Factory Training",
    ib_stat_saisons: "Completed Seasons",
    ib_stat_inbuilders: "Forged Inbuilders",
    ib_stat_jurys: "Specialized Jurors",
    ib_stat_live: "Shipped Live Projects",

    // InnerBuild Pillars
    ib_pillar_1_title: "Real Clients & True Briefs",
    ib_pillar_1_desc: "Each season pits participants against real brands (e.g. BenDjo) with real constraints, pressure-tested deliverables, and full flows.",
    ib_pillar_2_title: "Independent 7-Dimension Jury",
    ib_pillar_2_desc: "TypeScript Development, Branding & Art Direction, Marketing, Daily Communication, Acquisition, Business, and SEO & Performance.",
    ib_pillar_3_title: "Propelled Training: AI Factory",
    ib_pillar_3_desc: "212 curated AI skills, agent architectures, and hands-on practice studios to deliver end-to-end without friction.",

    // Challenges Page
    ch_tag: "The InnerBuild · Official Seasons",
    ch_title: "Challenges & Hackathons",
    ch_desc: "Tackle real-world challenges, ship projects under pressure, and receive comprehensive feedback from battle-tested pros.",
    ch_filter_all: "All challenges",
    ch_filter_active: "In Progress / Evaluation",
    ch_filter_completed: "Completed",
    ch_deadline: "Submission Deadline",
    ch_starts: "Start Date",
    ch_fee: "Entry Fee",
    ch_free: "Free",
    ch_days: "Days",
    ch_status_completed: "Completed",
    ch_status_active: "Active",
    ch_status_eval: "Jury Evaluation",
    ch_countdown_days: "d",
    ch_countdown_hours: "h",
    ch_countdown_mins: "m",
    ch_countdown_secs: "s",
    ch_view_results: "View Official Results",
    ch_join_now: "Enter Challenge",

    // Results Page
    res_tag: "The InnerBuild · Official Registry & Hall of Fame",
    res_title: "Results & Rankings",
    res_desc: "Official jury deliberations, certified scores, and rankings evaluated by the independent panel.",
    res_rank: "Rank",
    res_participant: "Participant",
    res_project: "Project Title",
    res_score: "Final Score",
    res_link: "Live Demo",
    res_view_details: "View dimensions",
    res_podium_gold: "1st Place · Champion",
    res_podium_silver: "2nd Place",
    res_bronze: "3rd Place",
    res_eval_dimensions: "Jury Evaluation Breakdown",

    // Auth
    auth_title_signin: "Sign In to The InnerBuild",
    auth_title_signup: "Create InnerBuild Account",
    auth_desc_signin: "Access your inbuilder workspace, training programs, and active challenges.",
    auth_desc_signup: "Join the forge of excellence and unlock automated partner discounts.",
    auth_email: "Email address",
    auth_password: "Password",
    auth_name: "Full name",
    auth_btn_signin: "Sign In",
    auth_btn_signup: "Create Account",
    auth_switch_to_up: "Don't have an account? Sign up",
    auth_switch_to_in: "Already registered? Sign in",
    auth_partner_badge: "Active Partnerships: BWT & 4Talents (-50% automatically applied)",

    // Jury
    jury_login_title: "Private Jury Access",
    jury_login_desc: "Enter your official jury access code to evaluate season submissions.",
    jury_code_label: "Jury Access Code (sent via email)",
    jury_btn_enter: "Enter Evaluation Studio",
  },
};

export function getSavedLanguage(): Language {
  if (typeof window === "undefined") return "fr";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved === "fr" || saved === "en") return saved;
  } catch {}
  return "fr";
}

export function setSavedLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent("innerbuild_lang_change", { detail: lang }));
  } catch {}
}

export function useLanguage() {
  const [lang, setLangState] = useState<Language>(getSavedLanguage);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Language>;
      if (custom.detail) setLangState(custom.detail);
    };
    window.addEventListener("innerbuild_lang_change", handler);
    return () => window.removeEventListener("innerbuild_lang_change", handler);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    setSavedLanguage(next);
  };

  const t = (key: keyof typeof translations.fr): string => {
    const dict = translations[lang] || translations.fr;
    return (dict as any)[key] || (translations.fr as any)[key] || key;
  };

  return { lang, setLang, t };
}
