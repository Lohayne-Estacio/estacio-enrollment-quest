/* Regras de cálculo do simulador, copiadas sem alteração do arquivo original.
 * Tabela 1 – PGE.05.235 (valor por MF por faixa) e Tabela 2 (bônus de núcleo).
 * Tabela 1 – PGE.05.008 (RVV de pós: múltiplo do salário-base). */

export const P_MES = 0.6,
  P_CICLO = 0.4,
  NUC_BONUS = 0.1,
  NUC_BONUS1 = 0.05;

/** Início de cada faixa de atingimento total (%). A última é aberta: sem teto acima de 200%. */
export const TH = [0, 50, 80, 100, 120, 150, 200];

/** Valor por MF em cada faixa: Presencial, Semipresencial, Ao vivo, EAD, Med. Vet. Presencial / Odonto. */
export const VAL: number[][] = [
  [20, 15, 10, 9, 50],
  [40, 30, 20, 18, 100],
  [56, 42, 28, 25, 140],
  [80, 60, 40, 35, 200],
  [96, 72, 48, 42, 240],
  [112, 84, 56, 49, 280],
  [128, 96, 64, 56, 320],
];

export const LV: [string, string][] = [
  ["🌱", "Filhote"],
  ["🌊", "Na beira do rio"],
  ["😎", "Pegando o ritmo"],
  ["🏆", "Meta batida"],
  ["⭐", "Líder da manada"],
  ["💎", "Elite"],
  ["👑", "Capivara Lendária"],
];

export const FAIXA = ["0–49%", "50–79%", "80–99%", "100–119%", "120–149%", "150–199%", "200%+"];

/** Índice da faixa (0–6) para um atingimento total em %. */
export const band = (p: number) => TH.reduce((b, t, i) => (p >= t ? i : b), 0);

/** Bônus de núcleo: +5% com núcleo de 100 a 109,99%; +10% com núcleo em 110%+. */
export const nucB = (n: number) => (n >= 110 ? NUC_BONUS : n >= 100 ? NUC_BONUS1 : 0);

/** Comissão: MF por modalidade × valor da faixa; bônus de núcleo só com 100%+ individual; paga 60% + 40%. */
export function comm(mf: number[], p: number, nuc: number) {
  const b = band(p),
    base = mf.reduce((a, x, i) => a + x * (VAL[b]?.[i] ?? 0), 0),
    bonus = p >= 100 ? base * nucB(nuc) : 0;
  return { b, base, bonus, tot: base + bonus, mes: (base + bonus) * P_MES, ciclo: (base + bonus) * P_CICLO };
}

/** RVV de pós (PGE.05.008): [início da faixa %, múltiplo do salário-base]. */
export const PB: [number, number][] = [
  [0, 0],
  [80, 0.05],
  [90, 0.15],
  [100, 0.2],
  [120, 0.25],
];
export const PL = ["Abaixo de 80%", "80 a 89,99%", "90 a 99,99%", "100 a 119,99%", "120% ou mais"];

/** Índice da faixa de pós para um atingimento em %. */
export const posBand = (p: number) => PB.reduce((k, x, i) => (p >= x[0] ? i : k), 0);

export const MODV_NOMES = ["Presencial", "Semipresencial", "Ao vivo", "EAD", "Med. Vet. / Odonto"];

/** Distribui MF extras no mix atual (ou no mix da meta, se nada foi realizado). Igual ao motor original. */
export function mixAdd(mf: number[], mt: number[], extra: number) {
  const s0 = mf.reduce((a, x) => a + x, 0),
    w = s0 > 0 ? mf : mt,
    ws = w.reduce((a, x) => a + x, 0);
  if (!ws) {
    const r = mf.slice();
    r[0] = (r[0] ?? 0) + extra;
    return r;
  }
  return mf.map((x, i) => x + (extra * (w[i] ?? 0)) / ws);
}

/** Cap!GO – "O que falta para avançar?" e "Quanto posso ganhar a mais?": MF até a próxima faixa e o ganho estimado. */
export function proximaFaixa(mf: number[], mt: number[], tr: number, tm: number, nuc: number) {
  if (!tm) return null;
  const p = (tr / tm) * 100,
    atual = comm(mf, p, nuc);
  if (atual.b >= TH.length - 1) return null;
  const alvo = TH[atual.b + 1] ?? 0,
    faltam = Math.max(Math.ceil((alvo / 100) * tm - tr), 1),
    depois = comm(mixAdd(mf, mt, faltam), ((tr + faltam) / tm) * 100, nuc);
  return { alvo, faltam, atual: atual.tot, depois: depois.tot, ganho: depois.tot - atual.tot };
}

/** Cap!GO – "O que devo priorizar agora?": modalidades com meta em aberto, da que mais paga por MF na faixa atual para a que menos paga. */
export function prioridades(mf: number[], mt: number[], b: number) {
  return mt
    .map((m, i) => {
      const faltam = Math.max(Math.ceil(m - (mf[i] ?? 0)), 0),
        valorMF = VAL[b]?.[i] ?? 0;
      return { i, nome: MODV_NOMES[i] ?? "", faltam, valorMF, potencial: faltam * valorMF };
    })
    .filter((o) => o.faltam > 0)
    .sort((a, z) => z.valorMF - a.valorMF || z.potencial - a.potencial);
}
