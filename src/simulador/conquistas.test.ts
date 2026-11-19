import { describe, expect, it } from "vitest";

import { calcConquistas, CONQUISTAS } from "./conquistas";
import { calcResumo } from "./resumo";

describe("conquistas do ranking", () => {
  it("não inclui nenhum selo financeiro", () => {
    const texto = JSON.stringify(CONQUISTAS);
    expect(texto).not.toMatch(/R\$|mil|salár|bônus de|\d+,\d{2}/i);
    expect(CONQUISTAS.map((c) => c.id)).toEqual([
      "largada",
      "aquecido",
      "meta",
      "turbo",
      "elite",
      "lendaria",
      "estrela",
      "nucleo",
      "pos",
    ]);
  });

  it("sem meta: nenhuma conquista", () => {
    expect(calcConquistas({})).toEqual([]);
  });

  it("faixas de % da meta, como os selos do engine", () => {
    const com = (r0: number) => calcConquistas({ m0: "10", r0: String(r0) });
    expect(com(1)).toEqual(["largada"]);
    expect(com(5)).toEqual(["largada", "aquecido"]);
    expect(com(10)).toEqual(["largada", "aquecido", "meta"]);
    expect(com(12)).toContain("turbo");
    expect(com(15)).toContain("elite");
    expect(com(20)).toEqual(["largada", "aquecido", "meta", "turbo", "elite", "lendaria"]);
  });

  it("cursos estrela: todas as metas estrela, Med. Vet. soma presencial + semi", () => {
    const base = { m0: "10", r0: "1", m4: "2", m7: "3" };
    expect(calcConquistas({ ...base, r4: "2", r7: "1", r12: "1" })).not.toContain("estrela");
    expect(calcConquistas({ ...base, r4: "2", r7: "1", r12: "2" })).toContain("estrela");
  });

  it("time na meta só com 100% individual e núcleo em 100%", () => {
    expect(calcConquistas({ m0: "10", r0: "9", nm: "100", nr: "120" })).not.toContain("nucleo");
    expect(calcConquistas({ m0: "10", r0: "10", nm: "100", nr: "99" })).not.toContain("nucleo");
    expect(calcConquistas({ m0: "10", r0: "10", nm: "100", nr: "100" })).toContain("nucleo");
  });

  it("pós na meta", () => {
    expect(calcConquistas({ m9: "4", r9: "3" })).toEqual([]);
    expect(calcConquistas({ m9: "4", r9: "3", r11: "1" })).toEqual(["pos"]);
  });

  it("vai junto no resumo salvo", () => {
    expect(calcResumo({ m0: "10", r0: "10" }, "2026-11").conquistas).toEqual([
      "largada",
      "aquecido",
      "meta",
    ]);
  });
});
