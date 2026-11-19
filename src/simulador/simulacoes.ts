/* Modo simulação.
 *
 * O engine roda igual, mas com um store em memória: metas, realizados, missão do dia, semana,
 * histórico e notas do 1:1 mudam só na tela. Nada vai para simulador_estado nem para
 * simulador_resumo, então a simulação não entra no ranking nem no painel do gestor.
 * O consultor grava quando quiser em `simulacoes` (privada), com nome e data. */
import { supabase } from "@/lib/supabase";

import { CAMPOS_KEY, DOC_KEYS, limparCampos, type Dados, type SimStore } from "./persistence";
import type { Campos } from "./resumo";

/** Chaves do perfil: continuam valendo no modo simulação (são da conta, não da produção). */
const CHAVES_PERFIL = ["sim-avatar", "sim-onb", "sim-foto", "sim-som"];

export type Simulacao = {
  id: string;
  nome: string;
  dados: Dados;
  created_at: string;
  updated_at: string;
};
export type SimulacaoResumo = Omit<Simulacao, "dados">;

/** Ponto de partida da simulação: o registro do mês com os campos da simulação (se houver).
 * `mes` e `cal` ficam no mês atual para o engine não fazer a virada nem recalcular os dias. */
export function semente(registro: Dados, mes: string, salva?: Dados | null): Dados {
  const d = JSON.parse(JSON.stringify(registro ?? {})) as Dados;
  if (salva?.campos) d.campos = { ...(salva.campos as Campos) };
  d.mes = mes;
  d.cal = mes;
  return d;
}

export function createSimStore(base: SimStore, inicial: Dados) {
  const dados: Dados = JSON.parse(JSON.stringify(inicial)) as Dados;
  let alterado = false;
  let ouvinte: ((a: boolean) => void) | null = null;

  const marcar = (a: boolean) => {
    if (alterado === a) return;
    alterado = a;
    ouvinte?.(a);
  };

  function get(k: string): string | null {
    if (CHAVES_PERFIL.includes(k) || !DOC_KEYS[k]) return base.get(k);
    const [campo, tipo] = DOC_KEYS[k]!;
    if (k === CAMPOS_KEY) {
      const p = base.perfil();
      const c = (dados.campos as Campos) || {};
      return JSON.stringify({ ...c, nome: p.nome, nucSel: p.nucleo ?? c.nucSel ?? "" });
    }
    const x = dados[campo];
    if (x == null) return null;
    return tipo === "json" ? JSON.stringify(x) : String(x);
  }

  function set(k: string, val: string) {
    if (CHAVES_PERFIL.includes(k) || !DOC_KEYS[k]) return base.set(k, val);
    const [campo, tipo] = DOC_KEYS[k]!;
    let x: unknown = val;
    if (tipo === "json") {
      try {
        x = JSON.parse(val);
      } catch {
        return;
      }
    }
    if (k === CAMPOS_KEY && x && typeof x === "object") {
      // nome e núcleo são da conta: no modo simulação não mudam o perfil.
      const c = limparCampos(x as Campos);
      delete c.nome;
      delete c.nucSel;
      x = c;
    }
    if (JSON.stringify(dados[campo]) === JSON.stringify(x)) return;
    dados[campo] = x;
    if (k === CAMPOS_KEY) marcar(true);
  }

  function del(k: string) {
    if (CHAVES_PERFIL.includes(k) || !DOC_KEYS[k]) return base.del(k);
    const [campo] = DOC_KEYS[k]!;
    if (!(campo in dados)) return;
    delete dados[campo];
    if (k === CAMPOS_KEY) marcar(true);
  }

  return {
    get,
    set,
    del,
    /** Perfil (avatar, foto, onboarding) continua indo para a conta. */
    flush: () => base.flush(),
    pendente: () => base.pendente(),
    alterado: () => alterado,
    marcarSalvo: () => marcar(false),
    aoAlterar: (fn: (a: boolean) => void) => {
      ouvinte = fn;
    },
    /** O que vai para a tabela `simulacoes`: só os campos do formulário, sem salário. */
    paraSalvar: (mes: string): Dados => ({
      campos: limparCampos((dados.campos as Campos) || {}),
      mes,
    }),
  };
}

export type SimModoStore = ReturnType<typeof createSimStore>;

/* ===== API (tabela simulacoes, RLS: só o dono) ===== */

const COLS = "id, nome, created_at, updated_at";

export async function listarSimulacoes(): Promise<SimulacaoResumo[]> {
  const { data, error } = await supabase
    .from("simulacoes")
    .select(COLS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function carregarSimulacao(id: string): Promise<Simulacao | null> {
  const { data, error } = await supabase
    .from("simulacoes")
    .select(`${COLS}, dados`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Simulacao | null) ?? null;
}

export async function salvarSimulacao(s: {
  id?: string | null;
  nome: string;
  dados: Dados;
}): Promise<SimulacaoResumo> {
  const nome = s.nome.trim().slice(0, 60);
  const q = s.id
    ? supabase
        .from("simulacoes")
        .update({ nome, dados: s.dados })
        .eq("id", s.id)
        .select(COLS)
        .single()
    : supabase.from("simulacoes").insert({ nome, dados: s.dados }).select(COLS).single();
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function excluirSimulacao(id: string) {
  const { error } = await supabase.from("simulacoes").delete().eq("id", id);
  if (error) throw error;
}

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const nomePadrao = (d = new Date()) =>
  `Simulação ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
