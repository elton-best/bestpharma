import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ModuleAVenir({ titre, description, sprint }: { titre: string; description: string; sprint: string }) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{titre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Construction className="size-10 text-accent-foreground" />
          <Badge variant="secondary">Prévu au {sprint}</Badge>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ce module fait partie du Lot 1.1 et sera livré au {sprint}. L'emplacement est déjà prêt dans le menu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
