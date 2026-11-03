"use client";

import React from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Code,
  FileCode2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link2,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MarkdownToolbarProps {
  textareaId?: string;
  onInsert?: (prefix: string, suffix?: string, defaultText?: string) => void;
  className?: string;
}

export function insertMarkdownAtCursor(
  textareaId: string,
  prefix: string,
  suffix = "",
  defaultText = "texte",
) {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = textarea.value;
  const selected = current.substring(start, end);
  const insertText = selected || defaultText;
  const replacement = `${prefix}${insertText}${suffix}`;
  const nextValue = current.substring(0, start) + replacement + current.substring(end);

  // Trigger React controlled input change if applicable
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(textarea, nextValue);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    textarea.value = nextValue;
  }

  setTimeout(() => {
    textarea.focus();
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + insertText.length;
    textarea.setSelectionRange(cursorStart, cursorEnd);
  }, 10);
}

export function MarkdownToolbar({
  textareaId = "studio-markdown-editor",
  onInsert,
  className,
}: MarkdownToolbarProps) {
  const handleAction = (prefix: string, suffix = "", defaultText = "texte") => {
    if (onInsert) {
      onInsert(prefix, suffix, defaultText);
    } else {
      insertMarkdownAtCursor(textareaId, prefix, suffix, defaultText);
    }
  };

  const btnClass =
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-ink transition-colors focus-visible:outline-hidden disabled:opacity-40";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-xl border border-line bg-card/80 p-1 shadow-xs backdrop-blur-xs",
        className,
      )}
      role="toolbar"
      aria-label="Barre d'outils Markdown"
    >
      {/* 1. Style de texte */}
      <button
        type="button"
        onClick={() => handleAction("**", "**", "Gras")}
        className={btnClass}
        title="Gras (**texte**)"
        aria-label="Gras"
      >
        <Bold className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("*", "*", "Italique")}
        className={btnClass}
        title="Italique (*texte*)"
        aria-label="Italique"
      >
        <Italic className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("~~", "~~", "Barré")}
        className={btnClass}
        title="Barré (~~texte~~)"
        aria-label="Barré"
      >
        <Strikethrough className="size-3.5" />
      </button>

      <div className="mx-1 h-3.5 w-px bg-line/80 self-center" />

      {/* 2. Titres */}
      <button
        type="button"
        onClick={() => handleAction("# ", "", "Titre 1")}
        className={btnClass}
        title="Titre 1 (# )"
        aria-label="Titre 1"
      >
        <Heading1 className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("## ", "", "Titre 2")}
        className={btnClass}
        title="Titre 2 (## )"
        aria-label="Titre 2"
      >
        <Heading2 className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("### ", "", "Titre 3")}
        className={btnClass}
        title="Titre 3 (### )"
        aria-label="Titre 3"
      >
        <Heading3 className="size-3.5" />
      </button>

      <div className="mx-1 h-3.5 w-px bg-line/80 self-center" />

      {/* 3. Code */}
      <button
        type="button"
        onClick={() => handleAction("`", "`", "code")}
        className={btnClass}
        title="Code en ligne (`code`)"
        aria-label="Code en ligne"
      >
        <Code className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("```ts\n", "\n```", "// code")}
        className={btnClass}
        title="Bloc de code (```ts)"
        aria-label="Bloc de code"
      >
        <FileCode2 className="size-3.5" />
      </button>

      <div className="mx-1 h-3.5 w-px bg-line/80 self-center" />

      {/* 4. Listes et tâches */}
      <button
        type="button"
        onClick={() => handleAction("- ", "", "Élément")}
        className={btnClass}
        title="Liste à puces (- )"
        aria-label="Liste à puces"
      >
        <List className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("1. ", "", "Étape")}
        className={btnClass}
        title="Liste numérotée (1. )"
        aria-label="Liste numérotée"
      >
        <ListOrdered className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("- [ ] ", "", "Tâche à faire")}
        className={btnClass}
        title="Checklist / Tâche (- [ ] )"
        aria-label="Checklist"
      >
        <CheckSquare className="size-3.5" />
      </button>

      <div className="mx-1 h-3.5 w-px bg-line/80 self-center" />

      {/* 5. Éléments avancés */}
      <button
        type="button"
        onClick={() => handleAction("> ", "", "Citation importante")}
        className={btnClass}
        title="Citation (> )"
        aria-label="Citation"
      >
        <Quote className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("[", "](https://exemple.com)", "Titre du lien")}
        className={btnClass}
        title="Lien hypertexte [titre](url)"
        aria-label="Lien"
      >
        <Link2 className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() =>
          handleAction(
            "\n| Entête 1 | Entête 2 | Entête 3 |\n| --- | --- | --- |\n| ",
            "Valeur 1 | Valeur 2 | Valeur 3 |\n",
            "",
          )
        }
        className={btnClass}
        title="Insérer un tableau Markdown"
        aria-label="Tableau"
      >
        <Table className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleAction("\n---\n", "", "")}
        className={btnClass}
        title="Ligne horizontale (---)"
        aria-label="Séparateur"
      >
        <Minus className="size-3.5" />
      </button>
    </div>
  );
}

export default MarkdownToolbar;
