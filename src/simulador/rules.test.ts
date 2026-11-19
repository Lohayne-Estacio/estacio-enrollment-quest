import { describe, expect, it } from "vitest";

import { band, comm, nucB, posBand, PB } from "./rules";

// mf = [Presencial, Semipresencial, Ao vivo, EAD, Med. Vet. Presencial/Odonto]
const one = (i: number) => [0, 1, 2, 3, 4].map((k) => (k === i ? 1 : 0));
const valuesFor = (i: number) => [25, 65, 90, 110, 130, 175, 250].map((p) => comm(one(i), p, 0).base);

describe("Valor por MF por faixa (PGE.05.235)", () => {
  it("faixas começam em 0, 50, 80, 100, 120, 150 e 200%, sem teto", () => {
    expect([0, 49.99, 50, 79.99, 80, 99.99, 100, 119.99, 120, 149.99, 150, 199.99, 200, 450].map(band)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ]);
  });
  it("Presencial paga 20/40/56/80/96/112/128", () => {
    expect(valuesFor(0)).toEqual([20, 40, 56, 80, 96, 112, 128]);
  });
  it("Semipresencial paga 15/30/42/60/72/84/96", () => {
    expect(valuesFor(1)).toEqual([15, 30, 42, 60, 72, 84, 96]);
  });
  it("Ao vivo paga 10/20/28/40/48/56/64", () => {
    expect(valuesFor(2)).toEqual([10, 20, 28, 40, 48, 56, 64]);
  });
  it("EAD paga 9/18/25/35/42/49/56", () => {
    expect(valuesFor(3)).toEqual([9, 18, 25, 35, 42, 49, 56]);
  });
  it("Med. Vet. Presencial e Odonto pagam 50/100/140/200/240/280/320", () => {
    expect(valuesFor(4)).toEqual([50, 100, 140, 200, 240, 280, 320]);
  });
});

describe("Bônus de núcleo", () => {
  it("+5% com núcleo de 100 a 109,99% e +10% com 110%+", () => {
    expect([99.99, 100, 109.99, 110].map(nucB)).toEqual([0, 0.05, 0.05, 0.1]);
  });
  it("só vale com 100%+ individual", () => {
    expect(comm([10, 0, 0, 0, 0], 99, 120).bonus).toBe(0);
    expect(comm([10, 0, 0, 0, 0], 100, 105).bonus).toBeCloseTo(40);
    expect(comm([10, 0, 0, 0, 0], 100, 110).bonus).toBeCloseTo(80);
  });
});

describe("Pagamento 60/40", () => {
  it("60% antecipação e 40% saldo sobre o total com bônus", () => {
    const c = comm([10, 0, 0, 0, 0], 100, 110); // 800 + 10% = 880
    expect(c.tot).toBeCloseTo(880);
    expect(c.mes).toBeCloseTo(528);
    expect(c.ciclo).toBeCloseTo(352);
  });
});

describe("RVV de pós (PGE.05.008)", () => {
  it("múltiplo do salário-base por faixa", () => {
    const mult = (p: number) => PB[posBand(p)]?.[1];
    expect([79.99, 80, 89.99, 90, 99.99, 100, 119.99, 120, 300].map(mult)).toEqual([
      0, 0.05, 0.05, 0.15, 0.15, 0.2, 0.2, 0.25, 0.25,
    ]);
  });
});
