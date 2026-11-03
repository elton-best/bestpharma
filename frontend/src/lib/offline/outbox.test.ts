import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { ConflitServeur, creerOutbox, type Operation } from "./outbox";

describe("File hors-ligne (E0-S7)", () => {
  it("rejoue dans l'ordre et sans doublon après reconnexion", async () => {
    const ob = creerOutbox("t1");
    const serveur = new Set<string>();
    const ordre: number[] = [];
    let enLigne = false;
    ob.enregistrerHandler("pointage", async (op: Operation) => {
      if (!enLigne) throw new Error("réseau");
      ordre.push(op.payload["n"] as number);
      if (serveur.has(op.client_op_id)) return "doublon";
      serveur.add(op.client_op_id);
      return "ok";
    });
    await ob.ajouter("pointage", { n: 1 });
    await ob.ajouter("pointage", { n: 2 });
    expect((await ob.synchroniser()).ok).toBe(0);
    expect(await ob.compterEnAttente()).toBe(2);
    enLigne = true;
    await Promise.all([ob.synchroniser(), ob.synchroniser()]);
    expect(ordre).toEqual([1, 2]);
    expect(serveur.size).toBe(2);
    expect(await ob.compterEnAttente()).toBe(0);
  });

  it("conserve l'heure de saisie locale", async () => {
    const ob = creerOutbox("t2");
    const op = await ob.ajouter("pointage", {});
    expect(Date.parse(op.saisie_locale_at)).not.toBeNaN();
  });

  it("le serveur fait foi : un conflit est signalé, pas réécrit", async () => {
    const ob = creerOutbox("t3");
    ob.enregistrerHandler("x", async () => {
      throw new ConflitServeur("déjà clôturé");
    });
    await ob.ajouter("x", {});
    const r = await ob.synchroniser();
    expect(r.conflits).toBe(1);
    expect(await ob.db.operations.where("statut").equals("conflit").count()).toBe(1);
  });
});
