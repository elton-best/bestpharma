import { lazy, Suspense, useState } from "react";
import { MessageQuestion } from "reicon-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const CoachChatContent = lazy(() => import("./CoachChatContent"));

function CoachLoading() {
  return (
    <div className="flex h-full min-h-64 items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-xs font-semibold text-muted-foreground">Ouverture du coach…</span>
      </div>
    </div>
  );
}

export function CoachPanel({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le coach"
        className="btn-glow fixed right-4 z-40 flex h-12 items-center justify-center gap-2 rounded-full px-4 font-bold shadow-lg bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:right-5 sm:h-auto sm:px-5 sm:py-3"
      >
        <MessageQuestion size={20} />
        <span className="hidden sm:inline">Coach</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="flex h-[min(92dvh,760px)] w-full flex-col gap-0 rounded-t-[28px] p-0 pb-[env(safe-area-inset-bottom,0px)] sm:h-full sm:max-w-xl sm:rounded-none md:max-w-2xl lg:max-w-3xl"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden />
          <SheetHeader className="shrink-0 border-b border-line px-5 py-3 pr-12 text-left sm:py-4">
            <SheetTitle>Coach AIFAC</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Une question pendant ta formation ? Il connaît tout le cours.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 px-2 pb-2 sm:px-4 sm:pb-4">
            {open && (
              <Suspense fallback={<CoachLoading />}>
                <CoachChatContent page={page} />
              </Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
