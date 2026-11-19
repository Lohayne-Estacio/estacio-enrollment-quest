/* Resumo mensal que o gestor do núcleo enxerga (tabela simulador_resumo).
 * Mesmas contas do engine (calc/game), só com as regras de ./rules.ts. Não usa o salário-base. */
import { comm, PB, posBand } from "./rules";

/** Valores do formulário como o engine salva (id do input → valor). */
export type Campos = {
  nome?: string | number | null | undefined;
  nucSel?: string | number | null | undefined;
  [id: string]: string | number | null | undefined;
};

export type Resumo = {
  mes: string;
  dias_uteis: number;
  dias_decorridos: number;
  meta_grad: number;
  realizado_grad: number;
  atingimento_grad_pct: number;
  faixa_grad: number;
  atingimento_nucleo_pct: number | null;
  rv_base: number;
  rv_bonus_nucleo: number;
  rv_total: number;
  rv_antecipacao: number;
  rv_saldo: number;
  meta_pos: number;
  realizado_pos: number;
  atingimento_pos_pct: number;
  faixa_pos: number;
  rvv_pos_multiplo: number;
};

/** Igual ao `v()` do engine: número ≥ 0, vazio/inválido vira 0. */
const num = (c: Campos, id: string) => Math.max(0, +(c[id] ?? 0) || 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Índices do engine: 0–3 modalidades, 7 Med. Vet. Presencial, 8 Odonto (somam na 5ª coluna), 9–11 pós. */
const GRAD = [0, 1, 2, 3] as const;

export function calcResumo(c: Campos, mes: string): Resumo {
  const du = Math.max(num(c, "du"), 1),
    dec = Math.min(num(c, "dec"), du);
  const m = (i: number) => num(c, "m" + i),
    r = (i: number) => num(c, "r" + i);
  const mt = [...GRAD.map(m), m(7) + m(8)],
    mf = [...GRAD.map(r), r(7) + r(8)];
  const tm = mt.reduce((a, x) => a + x, 0),
    tr = mf.reduce((a, x) => a + x, 0);
  const nm = num(c, "nm"),
    nr = num(c, "nr"),
    nuc = nm ? (nr / nm) * 100 : 0,
    p = tm ? (tr / tm) * 100 : 0;
  const k = comm(mf, p, nuc);
  const pM = m(9) + m(10) + m(11),
    pR = r(9) + r(10) + r(11),
    pp = pM ? (pR / pM) * 100 : 0,
    pi = posBand(pp);
  return {
    mes,
    dias_uteis: du,
    dias_decorridos: dec,
    meta_grad: tm,
    realizado_grad: tr,
    atingimento_grad_pct: r2(p),
    faixa_grad: k.b,
    atingimento_nucleo_pct: nm ? r2(nuc) : null,
    rv_base: r2(k.base),
    rv_bonus_nucleo: r2(k.bonus),
    rv_total: r2(k.tot),
    rv_antecipacao: r2(k.mes),
    rv_saldo: r2(k.ciclo),
    meta_pos: pM,
    realizado_pos: pR,
    atingimento_pos_pct: r2(pp),
    faixa_pos: pi,
    rvv_pos_multiplo: PB[pi]?.[1] ?? 0,
  };
}
