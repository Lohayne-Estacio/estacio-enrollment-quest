/* Conquistas para o ranking do núcleo: os selos do jogo (engine.ts, bloco "Conquistas")
 * sem os selos em R$, para o ranking não revelar nada financeiro. */
import type { Campos } from "./resumo";

export type Conquista = { id: string; icone: string; titulo: string; desc: string };

/** Na mesma ordem dos selos do engine. Os selos "R$ 1 mil", "R$ 2,5 mil" e "R$ 5 mil" ficam de fora. */
export const CONQUISTAS: Conquista[] = [
  { id: "largada", icone: "🎯", titulo: "Largada", desc: "1ª MF realizada" },
  { id: "aquecido", icone: "🔥", titulo: "Aquecido", desc: "50% da meta" },
  { id: "meta", icone: "🏆", titulo: "Meta batida", desc: "100% da meta" },
  { id: "turbo", icone: "🚀", titulo: "Turbo", desc: "120% da meta" },
  { id: "elite", icone: "💎", titulo: "Elite", desc: "150% da meta" },
  { id: "lendaria", icone: "👑", titulo: "Lendária", desc: "200% da meta" },
  { id: "estrela", icone: "⭐", titulo: "Cursos estrela", desc: "Todas as metas estrela" },
  {
    id: "nucleo",
    icone: "🤝",
    titulo: "Time na meta",
    desc: "100% individual com o núcleo na meta",
  },
  { id: "pos", icone: "🎓", titulo: "Pós na meta", desc: "100% de pós" },
];

export const conquistaPorId = new Map(CONQUISTAS.map((c) => [c.id, c]));

const num = (c: Campos, id: string) => Math.max(0, +(c[id] ?? 0) || 0);

/** Mesmas condições dos selos do engine, calculadas a partir dos campos salvos. */
export function calcConquistas(c: Campos): string[] {
  const m = (i: number) => num(c, "m" + i),
    r = (i: number) => num(c, "r" + i);
  const grad = [0, 1, 2, 3];
  const tm = grad.reduce((a, i) => a + m(i), 0) + m(7) + m(8),
    tr = grad.reduce((a, i) => a + r(i), 0) + r(7) + r(8);
  const p = tm ? (tr / tm) * 100 : 0;
  const nm = num(c, "nm"),
    nuc = nm ? (num(c, "nr") / nm) * 100 : 0;
  const pM = m(9) + m(10) + m(11),
    pp = pM ? ((r(9) + r(10) + r(11)) / pM) * 100 : 0;
  // Cursos estrela: Psicologia, Enfermagem, Direito, Med. Vet. (presencial + semi) e Odonto.
  const estrelas = [
    [m(4), r(4)],
    [m(5), r(5)],
    [m(6), r(6)],
    [m(7), r(7) + r(12)],
    [m(8), r(8)],
  ].filter(([meta]) => meta! > 0);
  const ok: Record<string, boolean> = {
    largada: tr > 0,
    aquecido: p >= 50,
    meta: p >= 100,
    turbo: p >= 120,
    elite: p >= 150,
    lendaria: p >= 200,
    estrela: estrelas.length > 0 && estrelas.every(([meta, real]) => real! >= meta!),
    nucleo: p >= 100 && nuc >= 100,
    pos: pM > 0 && pp >= 100,
  };
  return CONQUISTAS.filter((x) => ok[x.id]).map((x) => x.id);
}
