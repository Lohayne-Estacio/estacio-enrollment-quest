import { FAIXA, LV, PL } from "@/simulador/rules";

import type { SimuladorResumo } from "./database.types";

export type LinhaEquipe = {
  id: string;
  nome: string;
  email: string;
  nucleo: string;
  r: Pick<
    SimuladorResumo,
    | "meta_grad"
    | "realizado_grad"
    | "atingimento_grad_pct"
    | "faixa_grad"
    | "rv_total"
    | "rv_antecipacao"
    | "rv_saldo"
    | "meta_pos"
    | "realizado_pos"
    | "atingimento_pos_pct"
    | "faixa_pos"
    | "rvv_pos_multiplo"
    | "updated_at"
  > | null;
};

export type Coluna =
  | "nome"
  | "nucleo"
  | "realizado_grad"
  | "atingimento_grad_pct"
  | "faixa_grad"
  | "rv_total"
  | "rv_antecipacao"
  | "rv_saldo"
  | "faixa_pos"
  | "rvv_pos_multiplo";

/** Últimos `n` meses no formato AAAA-MM, do atual para trás. */
export function ultimosMeses(n = 3, hoje = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  });
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const nomeMes = (m: string) => {
  const [a, mm] = m.split("-");
  return `${MESES[+(mm ?? 1) - 1]}/${a}`;
};

export const nivel = (b: number) => `${LV[b]?.[0] ?? ""} ${LV[b]?.[1] ?? ""}`.trim();
export const faixaGrad = (b: number) => FAIXA[b] ?? "";
export const faixaPos = (b: number) => PL[b] ?? "";

const valor = (l: LinhaEquipe, c: Coluna): number | string => {
  if (c === "nome") return l.nome.toLocaleLowerCase("pt-BR");
  if (c === "nucleo") return l.nucleo;
  return l.r ? Number(l.r[c]) : -Infinity;
};

export function ordenar(linhas: LinhaEquipe[], col: Coluna, asc: boolean): LinhaEquipe[] {
  const s = asc ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const x = valor(a, col),
      y = valor(b, col);
    const d =
      typeof x === "string" && typeof y === "string"
        ? x.localeCompare(y, "pt-BR")
        : Number(x) - Number(y);
    return d * s || a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function totais(linhas: LinhaEquipe[]) {
  const com = linhas.filter((l) => l.r);
  const soma = (
    k:
      | "meta_grad"
      | "realizado_grad"
      | "rv_total"
      | "rv_antecipacao"
      | "rv_saldo"
      | "meta_pos"
      | "realizado_pos",
  ) => com.reduce((a, l) => a + Number(l.r?.[k] ?? 0), 0);
  const meta = soma("meta_grad"),
    real = soma("realizado_grad"),
    metaPos = soma("meta_pos"),
    realPos = soma("realizado_pos");
  return {
    consultores: linhas.length,
    comDados: com.length,
    metaGrad: meta,
    realizadoGrad: real,
    atingimentoGrad: meta ? (real / meta) * 100 : 0,
    rvTotal: soma("rv_total"),
    rvAntecipacao: soma("rv_antecipacao"),
    rvSaldo: soma("rv_saldo"),
    metaPos,
    realizadoPos: realPos,
    atingimentoPos: metaPos ? (realPos / metaPos) * 100 : 0,
    noAlvo: com.filter((l) => Number(l.r?.atingimento_grad_pct) >= 100).length,
  };
}

const n2 = (x: number) =>
  x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n1 = (x: number) => x.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function celula(x: string) {
  return /[";\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
}

/** CSV para Excel em português: separador ";", vírgula decimal e BOM. */
export function paraCsv(linhas: LinhaEquipe[], mes: string): string {
  const cab = [
    "Mês",
    "Nome",
    "E-mail",
    "Núcleo",
    "Meta grad. (MF)",
    "Matrículas grad. (MF)",
    "% atingimento grad.",
    "Faixa grad.",
    "Nível",
    "RV total estimada (R$)",
    "Antecipação 60% (R$)",
    "Saldo 40% (R$)",
    "Meta pós (MF)",
    "Matrículas pós (MF)",
    "% atingimento pós",
    "Faixa RVV pós",
    "Múltiplo RVV pós",
  ];
  const rows = linhas.map((l) => {
    const r = l.r;
    const base = [nomeMes(mes), l.nome, l.email, l.nucleo];
    if (!r) return [...base, ...Array(cab.length - base.length).fill("")];
    return [
      ...base,
      n1(Number(r.meta_grad)),
      n1(Number(r.realizado_grad)),
      n1(Number(r.atingimento_grad_pct)),
      faixaGrad(r.faixa_grad),
      nivel(r.faixa_grad),
      n2(Number(r.rv_total)),
      n2(Number(r.rv_antecipacao)),
      n2(Number(r.rv_saldo)),
      n1(Number(r.meta_pos)),
      n1(Number(r.realizado_pos)),
      n1(Number(r.atingimento_pos_pct)),
      faixaPos(r.faixa_pos),
      n2(Number(r.rvv_pos_multiplo)),
    ];
  });
  return "﻿" + [cab, ...rows].map((r) => r.map((c) => celula(String(c))).join(";")).join("\r\n");
}
