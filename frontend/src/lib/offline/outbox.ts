import Dexie, { type Table } from "dexie";

/**
 * File d'opérations hors-ligne (E0-S7).
 * - Chaque opération porte un `client_op_id` unique : le serveur doit le rendre
 *   idempotent (contrainte UNIQUE) pour éviter tout doublon au rejeu.
 * - `saisie_locale_at` conserve l'heure de saisie de l'appareil ; l'heure
 *   officielle reste celle du serveur (created_at).
 * - Conflit : le serveur fait foi. Une opération rejetée est marquée `conflit`
 *   et signalée à l'utilisateur, jamais réécrite silencieusement.
 */
export type OpStatut = "en_attente" | "conflit";

export interface Operation {
  seq?: number;
  client_op_id: string;
  type: string;
  payload: Record<string, unknown>;
  saisie_locale_at: string;
  statut: OpStatut;
  tentatives: number;
  erreur?: string;
}

export type Handler = (op: Operation) => Promise<"ok" | "doublon">;
export class ConflitServeur extends Error {}

class OutboxDB extends Dexie {
  operations!: Table<Operation, number>;
  constructor(name = "begpharma-outbox") {
    super(name);
    this.version(1).stores({ operations: "++seq, &client_op_id, statut" });
  }
}

export function creerOutbox(name?: string) {
  const db = new OutboxDB(name);
  const handlers = new Map<string, Handler>();
  let enCours: Promise<{ ok: number; conflits: number }> | null = null;

  async function ajouter(type: string, payload: Record<string, unknown>) {
    const op: Operation = {
      client_op_id: crypto.randomUUID(),
      type,
      payload,
      saisie_locale_at: new Date().toISOString(),
      statut: "en_attente",
      tentatives: 0,
    };
    await db.operations.add(op);
    return op;
  }

  /** Rejeu ordonné (ordre de saisie). S'arrête à la première erreur réseau. */
  async function synchroniser() {
    if (enCours) return enCours;
    enCours = (async () => {
      let ok = 0;
      let conflits = 0;
      const ops = await db.operations.where("statut").equals("en_attente").sortBy("seq");
      for (const op of ops) {
        const h = handlers.get(op.type);
        if (!h) continue;
        try {
          await h(op);
          await db.operations.delete(op.seq!);
          ok++;
        } catch (e) {
          if (e instanceof ConflitServeur) {
            await db.operations.update(op.seq!, { statut: "conflit", erreur: e.message });
            conflits++;
          } else {
            await db.operations.update(op.seq!, { tentatives: op.tentatives + 1 });
            break; // réseau indisponible : on garde l'ordre
          }
        }
      }
      return { ok, conflits };
    })().finally(() => {
      enCours = null;
    });
    return enCours;
  }

  return {
    db,
    ajouter,
    synchroniser,
    enregistrerHandler: (type: string, h: Handler) => handlers.set(type, h),
    compterEnAttente: () => db.operations.where("statut").equals("en_attente").count(),
  };
}

let instance: ReturnType<typeof creerOutbox> | null = null;
export function outbox() {
  if (!instance) instance = creerOutbox();
  return instance;
}
