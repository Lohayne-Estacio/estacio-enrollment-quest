/* Migração dos dados que ficavam só no localStorage (versão sem login) para a conta. */
import { nucleoAtual } from "@/lib/nucleos";

import { CAMPOS_KEY, limparCampos, type Dados, type KV } from "./persistence";
import type { Campos } from "./resumo";

export const LEGADO_KEYS = [
  CAMPOS_KEY,
  "sim-dia",
  "sim-sem",
  "sim-hist",
  "sim-1a1",
  "sim-foto",
  "sim-avatar",
  "sim-onb",
];
/** Chaves auxiliares do engine antigo que também saem do aparelho depois da importação. */
const LEGADO_AUX = ["sim-mes", "sim-cal"];

export type Legado = {
  dados: Dados;
  nome: string;
  nucleo: string | null;
  avatar: string | null;
  foto: string | null;
  onboarding: boolean;
};

const json = (local: KV, k: string): unknown => {
  try {
    const raw = local.getItem(k);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

/** Lê o que houver das chaves antigas. Devolve null se não houver nada para importar. */
export function lerLegado(local: KV | null): Legado | null {
  if (!local) return null;
  let tem = false;
  try {
    tem = LEGADO_KEYS.some((k) => local.getItem(k) != null);
  } catch {
    return null;
  }
  if (!tem) return null;
  const campos = (json(local, CAMPOS_KEY) as Campos | undefined) ?? undefined;
  const dados: Dados = {};
  if (campos && typeof campos === "object") {
    const c = limparCampos(campos);
    if (typeof c.nucSel === "string") c.nucSel = nucleoAtual(c.nucSel) ?? "";
    dados.campos = c;
  }
  const add = (k: string, campo: string) => {
    const x = json(local, k);
    if (x !== undefined) dados[campo] = x;
  };
  add("sim-dia", "dia");
  add("sim-sem", "sem");
  add("sim-hist", "hist");
  add("sim-1a1", "r11");
  const mesAnt = local.getItem("sim-mes"),
    cal = local.getItem("sim-cal");
  if (mesAnt) dados.mes = mesAnt;
  if (cal) dados.cal = cal;
  const c = (dados.campos as Campos | undefined) ?? {};
  const foto = local.getItem("sim-foto");
  return {
    dados,
    nome: typeof c.nome === "string" ? c.nome.trim() : "",
    nucleo: typeof c.nucSel === "string" && c.nucSel ? c.nucSel : null,
    avatar: local.getItem("sim-avatar"),
    foto: foto && foto.startsWith("data:image/") ? foto : null,
    onboarding: local.getItem("sim-onb") === "1",
  };
}

export function apagarLegado(local: KV | null) {
  if (!local) return;
  [...LEGADO_KEYS, ...LEGADO_AUX].forEach((k) => {
    try {
      local.removeItem(k);
    } catch {
      /* ignora */
    }
  });
}
