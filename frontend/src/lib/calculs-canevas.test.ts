import { expect, it } from "vitest";
import { recalculerCanevas } from "./calculs-canevas";
const source = {parties:[{blocs:[{lignes:[[
  {cle:"a",adresse:"A1",texte:""}, {cle:"b",adresse:"B1",texte:""},
  {cle:"c",adresse:"C1",texte:"999",calcul:{gauche:"A1",droite:"B1",operateur:"*"}},
]]}]}]};
it("recalcule une cotation et ignore un résultat fourni par le client", () => {
  expect(recalculerCanevas(source,{a:"2",b:"3",c:"999"}).c).toBe("6");
  expect(recalculerCanevas(source,{a:"25",b:"4"}).c).toBe("100");
});
it("ne transforme pas une donnée absente ou invalide en zéro", () => {
  expect(recalculerCanevas(source,{a:"",b:"3"}).c).toBe("");
  expect(recalculerCanevas(source,{a:"inconnue",b:"3"}).c).toBe("");
  expect(recalculerCanevas(source,{a:"0",b:"3"}).c).toBe("0");
  expect(recalculerCanevas(source,{a:"2,5",b:"4"}).c).toBe("10");
});
it("supporte les soldes négatifs et refuse une dépendance circulaire", () => {
  const clone = structuredClone(source); clone.parties[0].blocs[0].lignes[0][2].calcul!.operateur = "-";
  expect(recalculerCanevas(clone,{a:"5",b:"7"}).c).toBe("-2");
  clone.parties[0].blocs[0].lignes[0][2].calcul!.gauche = "C1";
  expect(recalculerCanevas(clone,{a:"5",b:"7"}).c).toBe("");
});
