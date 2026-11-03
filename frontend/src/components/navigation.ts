import {
  Home,
  Receipt,
  Stethoscope,
  ScanBarcode,
  ShoppingBag,
  ChartLine,
  Lock,
  TestTube,
  Thermometer,
  Building2,
  TickSquare,
  Clock,
  Users,
  FileText,
  DocumentText,
  TriangleWarning,
  Calendar,
  Setting2,
  Mobile,
  Shield,
} from "reicon-react";
import type { ComponentType } from "react";

export type ItemNav = {
  titre: string;
  url: string;
  icone: ComponentType<{ className?: string; size?: number; color?: string }>;
  sprint?: string;
};

export const navPrincipale: ItemNav[] = [
  { titre: "Tableau de bord", url: "/app", icone: Home },
  { titre: "Caisse POS", url: "/caisse", icone: Receipt, sprint: "Lot 2.1" },
  { titre: "Dispensation BPD", url: "/dispensation", icone: Stethoscope, sprint: "Lot 1.3" },
  { titre: "Facturation DGI", url: "/facturation", icone: ScanBarcode, sprint: "Lot 2.2" },
  { titre: "Stock & FEFO", url: "/stock", icone: ShoppingBag, sprint: "Lot 1.4" },
  { titre: "Comptabilité", url: "/comptabilite", icone: ChartLine, sprint: "Lot 3.1" },
  { titre: "Stupéfiants", url: "/stupefiants", icone: Lock, sprint: "Lot 1.4" },
  { titre: "Préparations", url: "/preparations", icone: TestTube, sprint: "Lot 1.4" },
  { titre: "Températures", url: "/temperatures", icone: Thermometer, sprint: "Lot 1.2" },
  { titre: "Locaux & Hygiène", url: "/locaux", icone: Building2, sprint: "Lot 1.2" },
  { titre: "Auto-évaluation", url: "/auto-evaluation", icone: TickSquare, sprint: "Lot 1.5" },
  { titre: "Pointage", url: "/pointage", icone: Clock, sprint: "S3" },
  { titre: "Personnel", url: "/personnel", icone: Users, sprint: "S2" },
  { titre: "Documents", url: "/documents", icone: FileText, sprint: "S4" },
  { titre: "Modèles", url: "/modeles", icone: DocumentText, sprint: "S5" },
  { titre: "Non-conformités", url: "/non-conformites", icone: TriangleWarning, sprint: "S5" },
  { titre: "Échéances", url: "/echeances", icone: Calendar, sprint: "S6" },
];

export const navAdmin: ItemNav[] = [
  { titre: "Paramètres", url: "/parametres", icone: Setting2 },
  { titre: "Journal d'audit", url: "/journal", icone: FileText },
  { titre: "Appareils", url: "/appareils", icone: Mobile },
  { titre: "Sécurité", url: "/securite", icone: Shield },
];
