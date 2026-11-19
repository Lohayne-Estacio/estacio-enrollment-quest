import { describe, expect, it } from "vitest";

import { ordenar, paraCsv, totais, ultimosMeses, type LinhaEquipe } from "./equipe";

const r = (o: Partial<NonNullable<LinhaEquipe["r"]>>): NonNullable<LinhaEquipe["r"]> => ({
  meta_grad: 0,
  realizado_grad: 0,
  atingimento_grad_pct: 0,
  faixa_grad: 0,
  rv_total: 0,
  rv_antecipacao: 0,
  rv_saldo: 0,
  meta_pos: 0,
  realizado_pos: 0,
  atingimento_pos_pct: 0,
  faixa_pos: 0,
  rvv_pos_multiplo: 0,
  updated_at: "",
  ...o,
});

const L: LinhaEquipe[] = [
  {
    id: "1",
    nome: "Bruna",
    email: "b@estacio.br",
    nucleo: "Curitiba",
    r: r({
      meta_grad: 10,
      realizado_grad: 12,
      atingimento_grad_pct: 120,
      faixa_grad: 4,
      rv_total: 1000,
      rv_antecipacao: 600,
      rv_saldo: 400,
    }),
  },
  {
    id: "2",
    nome: 'Ana; "A"',
    email: "a@estacio.br",
    nucleo: "Curitiba",
    r: r({
      meta_grad: 10,
      realizado_grad: 5,
      atingimento_grad_pct: 50,
      faixa_grad: 1,
      rv_total: 200,
      rv_antecipacao: 120,
      rv_saldo: 80,
    }),
  },
  { id: "3", nome: "Caio", email: "c@estacio.br", nucleo: "Londrina", r: null },
];

describe("painel da equipe", () => {
  it("três últimos meses, virando o ano", () => {
    expect(ultimosMeses(3, new Date(2026, 0, 15))).toEqual(["2026-01", "2025-12", "2025-11"]);
  });
  it("ordena por coluna; quem não tem dados vai para o fim na ordem decrescente", () => {
    expect(ordenar(L, "atingimento_grad_pct", false).map((l) => l.id)).toEqual(["1", "2", "3"]);
    expect(ordenar(L, "nome", true).map((l) => l.id)).toEqual(["2", "1", "3"]);
  });
  it("totais do time", () => {
    expect(totais(L)).toMatchObject({
      consultores: 3,
      comDados: 2,
      metaGrad: 20,
      realizadoGrad: 17,
      atingimentoGrad: 85,
      rvTotal: 1200,
      rvAntecipacao: 720,
      rvSaldo: 480,
      noAlvo: 1,
    });
  });
  it("CSV com ; , BOM, vírgula decimal e aspas escapadas", () => {
    const csv = paraCsv(L, "2026-11");
    expect(csv.startsWith("﻿")).toBe(true);
    const linhas = csv.slice(1).split("\r\n");
    expect(linhas).toHaveLength(4);
    expect(linhas[1]).toContain("nov/2026;Bruna;b@estacio.br;Curitiba;10;12;120;120–149%");
    expect(linhas[1]).toContain("1.000,00;600,00;400,00");
    expect(linhas[2]).toContain('"Ana; ""A"""');
    expect(linhas[3]!.split(";")).toHaveLength(17);
  });
});
