"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast, ToastIcons } from "@/components/ui/heroui-toast";
import { HeroAlertDialog } from "@/components/ui/heroui-alert-dialog";
import {
  ToggleButtonGroup,
  ToggleButton,
  Icons as FormatIcons,
} from "@/components/ui/heroui-toggle-group";
import { Trash2 } from "lucide-react";

export function HeroUIDemo() {
  const [format, setFormat] = useState<string[]>(["bold"]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Simulated promise for toast
  const simulateSave = () => {
    return new Promise<{ filesCount: number }>((resolve) => {
      setTimeout(() => resolve({ filesCount: 3 }), 1500);
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-10 font-sans">
      <div className="border-b border-line pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">
          HeroUI Components Adapted for AIFAC
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Composants HeroUI v3 fidèlement adaptés avec shadcn/ui, Radix UI, Sonner et Lucide Icons.
        </p>
      </div>

      {/* 1. Toast Section */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-ink">1. HeroUI Toast Notifications</h3>
        <p className="text-xs text-muted-foreground">
          Bannières riches avec icônes de statut, description, boutons d'action et support Promise.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const id = toast("Invitation d'équipe", {
                description: "Vous avez été invité à rejoindre l'espace workspace AIFAC.",
                indicator: <ToastIcons.Users className="size-4 text-blue-500" />,
                actionProps: {
                  children: "Accepter",
                  variant: "default",
                  onClick: () => {
                    toast.success("Invitation acceptée !");
                    toast.close(id);
                  },
                },
              });
            }}
          >
            Toast Default + Action
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              toast.info("Crédits IA", {
                description: "Il vous reste 2 crédits de questions prioritaires.",
              });
            }}
          >
            Accent (Info)
          </Button>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              toast.success("Projet sauvegardé", {
                description: "Toutes vos modifications ont été synchronisées dans le Cloud.",
              });
            }}
          >
            Success
          </Button>

          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => {
              toast.warning("Quota proche de la limite", {
                description: "Vous avez consommé 85% de votre bande passante OCR aujourd'hui.",
              });
            }}
          >
            Warning
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              toast.danger("Espace de stockage plein", {
                description: "Supprimez des fichiers pour libérer de la mémoire sur le serveur.",
                indicator: <ToastIcons.HardDrive className="size-4 text-rose-500" />,
                actionProps: {
                  children: "Nettoyer",
                  variant: "danger",
                  onClick: () => toast.info("Nettoyage en cours..."),
                },
              });
            }}
          >
            Danger
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.promise(simulateSave(), {
                loading: "Sauvegarde en cours...",
                success: (data) => `${data.filesCount} fichiers synchronisés avec succès.`,
                error: "Échec de la sauvegarde.",
              });
            }}
          >
            Promise Toast
          </Button>
        </div>
      </section>

      {/* 2. AlertDialog Section */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-ink">2. HeroUI Alert Dialog</h3>
        <p className="text-xs text-muted-foreground">
          Modale de confirmation d'action critique avec icône d'état, backdrop flouté et boutons stylisés.
        </p>

        <HeroAlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <HeroAlertDialog.Trigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="size-4" />
              Supprimer le projet
            </Button>
          </HeroAlertDialog.Trigger>

          <HeroAlertDialog.Backdrop>
            <HeroAlertDialog.Container>
              <HeroAlertDialog.Dialog className="sm:max-w-[420px]">
                <HeroAlertDialog.CloseTrigger />

                <HeroAlertDialog.Header>
                  <HeroAlertDialog.Icon status="danger" />
                  <div>
                    <HeroAlertDialog.Heading>
                      Supprimer définitivement le projet ?
                    </HeroAlertDialog.Heading>
                  </div>
                </HeroAlertDialog.Header>

                <HeroAlertDialog.Body>
                  Cette action supprimera définitivement le projet{" "}
                  <strong className="text-ink font-semibold">Mon Super Projet IA</strong> ainsi que
                  tous ses rendus, analyses et discussions associés. Cette opération est
                  irréversible.
                </HeroAlertDialog.Body>

                <HeroAlertDialog.Footer>
                  <HeroAlertDialog.Cancel asChild>
                    <Button variant="outline" size="sm">
                      Annuler
                    </Button>
                  </HeroAlertDialog.Cancel>

                  <HeroAlertDialog.Action asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        toast.danger("Projet supprimé avec succès.");
                      }}
                    >
                      Supprimer le projet
                    </Button>
                  </HeroAlertDialog.Action>
                </HeroAlertDialog.Footer>
              </HeroAlertDialog.Dialog>
            </HeroAlertDialog.Container>
          </HeroAlertDialog.Backdrop>
        </HeroAlertDialog>
      </section>

      {/* 3. ToggleButtonGroup Section */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-ink">3. HeroUI ToggleButtonGroup</h3>
        <p className="text-xs text-muted-foreground">
          Boutons d'options pour mise en forme de texte avec mode multiple et séparateur.
        </p>

        <div className="flex items-center gap-4">
          <ToggleButtonGroup
            selectionMode="multiple"
            value={format}
            onValueChange={(val) => setFormat(val as string[])}
          >
            <ToggleButton isIconOnly aria-label="Gras" id="bold">
              <FormatIcons.Bold className="size-4" />
            </ToggleButton>

            <ToggleButton isIconOnly aria-label="Italique" id="italic">
              <ToggleButtonGroup.Separator />
              <FormatIcons.Italic className="size-4" />
            </ToggleButton>

            <ToggleButton isIconOnly aria-label="Souligné" id="underline">
              <ToggleButtonGroup.Separator />
              <FormatIcons.Underline className="size-4" />
            </ToggleButton>

            <ToggleButton isIconOnly aria-label="Barré" id="strikethrough">
              <ToggleButtonGroup.Separator />
              <FormatIcons.Strikethrough className="size-4" />
            </ToggleButton>
          </ToggleButtonGroup>

          <span className="text-xs text-muted-foreground">
            Sélections actives :{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-ink">
              {format.length > 0 ? format.join(", ") : "aucune"}
            </code>
          </span>
        </div>
      </section>
    </div>
  );
}

export default HeroUIDemo;
