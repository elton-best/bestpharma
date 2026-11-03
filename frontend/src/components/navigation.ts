import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  LayoutTemplate,
  AlertTriangle,
  CalendarClock,
  Settings,
  ShieldCheck,
  ScrollText,
  Smartphone,
  Thermometer,
  Building2,
  CheckSquare,
  PackageCheck,
  Stethoscope,
  Lock,
  FlaskConical,
  Receipt,
  QrCode,
  BookOpenCheck,
  type LucideIcon,
} from "lucide-react";

export type ItemNav = { titre: string; url: string; icone: LucideIcon; sprint?: string };

export const navPrincipale: ItemNav[] = [
  { titre: "Tableau de bord", url: "/app", icone: LayoutDashboard },
  { titre: "Caisse POS", url: "/caisse", icone: Receipt, sprint: "Lot 2.1" },
  { titre: "Dispensation BPD", url: "/dispensation", icone: Stethoscope, sprint: "Lot 1.3" },
  { titre: "Facturation DGI", url: "/facturation", icone: QrCode, sprint: "Lot 2.2" },
  { titre: "Stock & FEFO", url: "/stock", icone: PackageCheck, sprint: "Lot 1.4" },
  { titre: "Comptabilité", url: "/comptabilite", icone: BookOpenCheck, sprint: "Lot 3.1" },
  { titre: "Stupéfiants", url: "/stupefiants", icone: Lock, sprint: "Lot 1.4" },
  { titre: "Préparations", url: "/preparations", icone: FlaskConical, sprint: "Lot 1.4" },
  { titre: "Températures", url: "/temperatures", icone: Thermometer, sprint: "Lot 1.2" },
  { titre: "Locaux & Hygiène", url: "/locaux", icone: Building2, sprint: "Lot 1.2" },
  { titre: "Auto-évaluation", url: "/auto-evaluation", icone: CheckSquare, sprint: "Lot 1.5" },
  { titre: "Pointage", url: "/pointage", icone: Clock, sprint: "S3" },
  { titre: "Personnel", url: "/personnel", icone: Users, sprint: "S2" },
  { titre: "Documents", url: "/documents", icone: FileText, sprint: "S4" },
  { titre: "Modèles", url: "/modeles", icone: LayoutTemplate, sprint: "S5" },
  { titre: "Non-conformités", url: "/non-conformites", icone: AlertTriangle, sprint: "S5" },
  { titre: "Échéances", url: "/echeances", icone: CalendarClock, sprint: "S6" },
];

export const navAdmin: ItemNav[] = [
  { titre: "Paramètres", url: "/parametres", icone: Settings },
  { titre: "Journal d'audit", url: "/journal", icone: ScrollText },
  { titre: "Appareils", url: "/appareils", icone: Smartphone },
  { titre: "Sécurité", url: "/securite", icone: ShieldCheck },
];
