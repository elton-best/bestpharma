import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  d1DeleteServerFn,
  d1InsertServerFn,
  d1ListServerFn,
  d1UpdateServerFn,
} from "./d1-data.functions";
import { ensureLearningResourcesTableServerFn } from "./learning-resources.functions";
import { uploadToR2ServerFn } from "./storage.functions";

// Ressources pédagogiques : créées par l'admin dans /admin/ressources,
// consultées par les apprenants dans l'onglet « Ressources » de /app/ressources.

export const RESOURCE_CATEGORIES = [
  { id: "guide", label: "Guide" },
  { id: "outil", label: "Outil" },
  { id: "lecture", label: "Lecture" },
  { id: "video", label: "Vidéo" },
  { id: "modele", label: "Modèle" },
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]["id"];

export type ResourceLink = { label: string; url: string };

export type LearningResource = {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  image_url: string;
  image_key: string;
  links: ResourceLink[];
  tags: string[];
  skill_id: string;
  position: number;
  published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ResourceInput = {
  title: string;
  description: string;
  category: ResourceCategory;
  image_url: string;
  image_key: string;
  links: ResourceLink[];
  tags: string[];
  skill_id: string;
  published: boolean;
};

function parseJsonArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v !== "string" || !v.trim()) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toBool(v: unknown) {
  return v === 1 || v === true;
}

function normalize(row: any): LearningResource {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: (row.category ?? "guide") as ResourceCategory,
    image_url: String(row.image_url ?? ""),
    image_key: String(row.image_key ?? ""),
    links: parseJsonArray<ResourceLink>(row.links).filter((l) => l && l.url),
    tags: parseJsonArray<string>(row.tags),
    skill_id: String(row.skill_id ?? ""),
    position: Number(row.position ?? 0),
    published: toBool(row.published),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Garantit l'existence de la table avant toute lecture/écriture admin. */
export function useEnsureResourcesTable() {
  return useQuery({
    queryKey: ["learning-resources-table"],
    queryFn: async () => {
      const res = await ensureLearningResourcesTableServerFn();
      return res.success;
    },
    staleTime: Infinity,
    retry: false,
  });
}

/** Ressources publiées, triées — vue apprenant. */
export function usePublishedResources() {
  return useQuery({
    queryKey: ["learning-resources", "published"],
    queryFn: async () => {
      try {
        const res = await d1ListServerFn({
          data: {
            table: "learning_resources",
            where: { published: 1 },
            orderBy: "position",
            orderDir: "ASC",
            limit: 200,
          },
        });
        return ((res.rows || []) as any[]).map(normalize);
      } catch {
        return [] as LearningResource[];
      }
    },
  });
}

/** Toutes les ressources, publiées ou non — vue admin. */
export function useAdminResources(enabled = true) {
  return useQuery({
    queryKey: ["learning-resources", "admin"],
    queryFn: async () => {
      const res = await d1ListServerFn({
        data: {
          table: "learning_resources",
          orderBy: "position",
          orderDir: "ASC",
          limit: 500,
        },
      });
      if (!res.success) throw new Error(res.error || "Base D1 injoignable.");
      return ((res.rows || []) as any[]).map(normalize);
    },
    enabled,
  });
}

/** Envoie une image dans R2 et renvoie son URL publique + sa clé. */
export async function uploadResourceImage(file: File) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `ressources/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const res = await uploadToR2ServerFn({
    data: { key, base64, contentType: file.type || "image/jpeg" },
  });
  if (!res.success) throw new Error(res.error || "Envoi de l'image impossible.");
  return { url: res.url, key };
}

export function useResourceMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["learning-resources"] });
  };

  const toRow = (v: ResourceInput, position?: number) => ({
    title: v.title.trim(),
    description: v.description.trim(),
    category: v.category,
    image_url: v.image_url.trim(),
    image_key: v.image_key.trim(),
    links: JSON.stringify(
      v.links.filter((l) => l.url.trim()).map((l) => ({ ...l, url: l.url.trim() })),
    ),
    tags: JSON.stringify(v.tags.map((t) => t.trim()).filter(Boolean)),
    skill_id: v.skill_id.trim(),
    published: v.published ? 1 : 0,
    ...(position === undefined ? {} : { position }),
  });

  return {
    insert: useMutation({
      mutationFn: async (v: ResourceInput) => {
        const existing = await d1ListServerFn({
          data: {
            table: "learning_resources",
            orderBy: "position",
            orderDir: "DESC",
            limit: 1,
          },
        });
        const position = Number(((existing.rows || [])[0] as any)?.position ?? -1) + 1;
        const res = await d1InsertServerFn({
          data: { table: "learning_resources", row: toRow(v, position) },
        });
        if (!res.success) throw new Error(res.error || "Enregistrement impossible.");
      },
      onSuccess: invalidate,
    }),

    update: useMutation({
      mutationFn: async (v: ResourceInput & { id: string }) => {
        const res = await d1UpdateServerFn({
          data: { table: "learning_resources", id: v.id, patch: toRow(v) },
        });
        if (!res.success) throw new Error(res.error || "Mise à jour impossible.");
      },
      onSuccess: invalidate,
    }),

    remove: useMutation({
      mutationFn: async (id: string) => {
        const res = await d1DeleteServerFn({ data: { table: "learning_resources", id } });
        if (!res.success) throw new Error(res.error || "Suppression impossible.");
      },
      onSuccess: invalidate,
    }),

    move: useMutation({
      mutationFn: async (v: { id: string; position: number }) => {
        const res = await d1UpdateServerFn({
          data: { table: "learning_resources", id: v.id, patch: { position: v.position } },
        });
        if (!res.success) throw new Error(res.error || "Réordonnancement impossible.");
      },
      onSuccess: invalidate,
    }),
  };
}
