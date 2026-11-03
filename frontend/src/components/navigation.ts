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
  type LucideIcon,
} from "lucide-react";

export type ItemNav = { titre: string; url: string; icone: LucideIcon; sprint?: string };

export const navPrincipale: ItemNav[] = [
  { titre: "Tableau de bord", url: "/", icone: LayoutDashboard },
  { titre: "Personnel", url: "/personnel", icone: Users, sprint: "S2" },
  { titre: "Pointage", url: "/pointage", icone: Clock, sprint: "S3" },
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
