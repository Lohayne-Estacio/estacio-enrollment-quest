/* Liga o adaptador de persistência ao Supabase: carrega o mês atual, perfil, papéis e núcleos,
 * importa dados antigos do aparelho e devolve o store que o engine usa. */
import type { User } from "@supabase/supabase-js";

import { meusPapeis } from "@/lib/auth";
import type { AppRole } from "@/lib/database.types";
import { listarNucleos, nucleoAtual } from "@/lib/nucleos";
import { supabase } from "@/lib/supabase";
import { AVATAR_BUCKET } from "@/lib/supabase-config";

import { apagarLegado, lerLegado } from "./migracao";
import type { Campos } from "./resumo";
import {
  CAMPOS_KEY,
  createStore,
  escolherDados,
  lerCache,
  type Backend,
  type Dados,
  type KV,
  type Perfil,
  type SimStore,
} from "./persistence";

/** Mesmo formato do MKEY do engine (mês local AAAA-MM). */
export const mesAtual = (d = new Date()) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");

const localKV = (): KV | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

async function dataUrlParaBlob(url: string) {
  const r = await fetch(url);
  return r.blob();
}

export function supabaseBackend(uid: string): Backend {
  const ok = <T extends { error: unknown }>(r: T) => {
    if (r.error) throw r.error;
    return r;
  };
  return {
    async saveEstado(mes, dados) {
      ok(
        await supabase
          .from("simulador_estado")
          .upsert({ user_id: uid, mes, dados }, { onConflict: "user_id,mes" }),
      );
    },
    async saveResumo(resumo) {
      ok(
        await supabase
          .from("simulador_resumo")
          .upsert({ user_id: uid, ...resumo }, { onConflict: "user_id,mes" }),
      );
    },
    async saveProfile(patch) {
      ok(await supabase.from("profiles").update(patch).eq("id", uid));
    },
    async uploadFoto(dataUrl) {
      const blob = await dataUrlParaBlob(dataUrl);
      const tipo =
        blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
      const ext = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      ok(
        await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, blob, { contentType: tipo, upsert: true }),
      );
      return path;
    },
    async removeFoto(path) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    },
  };
}

export async function urlDaFoto(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

/** Apaga a cópia offline deste usuário (ao sair, para não deixar notas do 1:1 num aparelho compartilhado). */
export function limparCacheLocal(uid: string) {
  const local = localKV();
  try {
    local?.removeItem(`sim-nuvem:${uid}`);
    local?.removeItem(`sim-nuvem-perfil:${uid}`);
  } catch {
    /* ignora */
  }
}

export type Carga = {
  store: SimStore;
  perfil: Perfil;
  email: string;
  papeis: AppRole[];
  nucleos: string[];
  nucleoTravado: boolean;
  migrou: boolean;
  offline: boolean;
};

const PERFIL_VAZIO: Perfil = {
  nome: "",
  nucleo: null,
  avatar_emoji: null,
  foto_path: null,
  onboarding_concluido: false,
};

export async function carregarSimulador(
  user: User,
  cb: { onErro?: () => void; onNucleoDefinido?: (n: string) => void } = {},
): Promise<Carga> {
  const uid = user.id,
    mes = mesAtual(),
    local = localKV();
  const cacheKey = `sim-nuvem:${uid}`,
    perfilKey = `sim-nuvem-perfil:${uid}`;

  const [pRes, papeis, nucleos, eRes, ultRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("nome, nucleo, avatar_emoji, foto_path, onboarding_concluido")
      .eq("id", uid)
      .maybeSingle(),
    meusPapeis(),
    listarNucleos(),
    supabase
      .from("simulador_estado")
      .select("dados, updated_at")
      .eq("user_id", uid)
      .eq("mes", mes)
      .maybeSingle(),
    supabase
      .from("simulador_estado")
      .select("mes, dados")
      .eq("user_id", uid)
      .order("mes", { ascending: false })
      .limit(1),
  ]);

  const offline = !!(pRes.error || eRes.error);
  let perfil: Perfil;
  if (pRes.data) {
    perfil = { ...PERFIL_VAZIO, ...pRes.data };
    try {
      local?.setItem(perfilKey, JSON.stringify(perfil));
    } catch {
      /* ignora */
    }
  } else {
    try {
      perfil = { ...PERFIL_VAZIO, ...(JSON.parse(local?.getItem(perfilKey) || "null") ?? {}) };
    } catch {
      perfil = { ...PERFIL_VAZIO };
    }
  }

  const cache = lerCache(local, cacheKey);
  const servidor = eRes.data
    ? { dados: (eRes.data.dados as Dados) ?? {}, updated_at: eRes.data.updated_at }
    : null;
  let { dados, pendente } = escolherDados(servidor, cache, mes);

  // Mês novo sem linha ainda: parte do último mês salvo (nome, núcleo, histórico, notas do 1:1).
  // O engine vê `mes` antigo e faz a virada (zera metas e realizados), como no original.
  const ultimo = ultRes.data?.[0];
  if (!servidor && !Object.keys(dados).length && ultimo && ultimo.mes !== mes) {
    dados = JSON.parse(JSON.stringify(ultimo.dados ?? {})) as Dados;
    if (!dados.mes) dados.mes = ultimo.mes;
    pendente = true;
  }

  // Primeira entrada: importa o que estava só neste aparelho (versão sem login).
  const semNada = !offline && !servidor && !ultimo;
  const legado = semNada ? lerLegado(local) : null;
  if (legado) dados = legado.dados;

  const admin = papeis.includes("admin");
  const store = createStore({
    mes,
    dados,
    perfil,
    fotoUrl: await urlDaFoto(perfil.foto_path).catch(() => null),
    podeTrocarNucleo: admin,
    backend: supabaseBackend(uid),
    local,
    cacheKey,
    onErro: cb.onErro,
    onNucleoDefinido: cb.onNucleoDefinido,
  });

  if (legado) {
    // Nome e núcleo da conta têm prioridade sobre os do aparelho.
    const c: Campos = { ...((dados.campos as Campos) ?? {}) };
    c.nome = perfil.nome || legado.nome;
    c.nucSel =
      perfil.nucleo || (legado.nucleo && nucleos.includes(legado.nucleo) ? legado.nucleo : "");
    store.set(CAMPOS_KEY, JSON.stringify(c));
    if (legado.avatar && !perfil.avatar_emoji) store.set("sim-avatar", legado.avatar);
    if (legado.onboarding && !perfil.onboarding_concluido) store.set("sim-onb", "1");
    if (legado.foto && !perfil.foto_path) store.set("sim-foto", legado.foto);
    store.marcarPendente();
    await store.flush();
    if (!store.pendente()) apagarLegado(local);
  } else if (pendente) {
    store.marcarPendente();
  }

  const p = store.perfil();
  return {
    store,
    perfil: { ...p, nucleo: nucleoAtual(p.nucleo) },
    email: user.email ?? "",
    papeis,
    nucleos,
    nucleoTravado: store.nucleoTravado(),
    migrou: !!legado,
    offline,
  };
}
