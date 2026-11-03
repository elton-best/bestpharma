import { AiChat } from "./AiChat";
import { useLearnerContext } from "@/lib/learner-context";

export default function CoachChatContent({ page }: { page: string }) {
  const context = useLearnerContext(page);

  return (
    <AiChat
      compact
      storageKey="aifac-coach"
      mode="coach"
      context={context}
      suggestions={[
        "Je bloque sur ma leçon",
        "Explique-moi la spec testable",
        "Quelle est ma prochaine étape ?",
      ]}
    />
  );
}
