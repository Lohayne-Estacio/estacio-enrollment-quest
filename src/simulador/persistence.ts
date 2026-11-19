/* Adaptador de persistência do simulador.
 *
 * O engine continua falando com uma API síncrona igual ao localStorage (get/set/del com strings).
 * Aqui essas chaves viram:
 *   - simulador_estado.dados do mês atual (metas, realizados, dia, semana, histórico, 1:1, calendário);
 *   - profiles (nome, núcleo, avatar emoji, foto, onboarding);
 *   - simulador_resumo, recalculado com rules.ts a cada salvamento.
 * As gravações no banco saem com debounce; o localStorage guarda só uma cópia offline.
 * O salário-base (#sal) nunca é gravado. */
import { calcResumo, type Campos, type Resumo } from "./resumo";

export const CAMPOS_KEY = "simulador-consultor-meta-v3";

/** Chave do engine → campo em simulador_estado.dados ("json" guarda o objeto já decodificado). */
export const DOC_KEYS: Record<string, [campo: string, tipo: "json" | "str"]> = {
  [CAMPOS_KEY]: ["campos", "json"],
  "sim-dia": ["dia", "json"],
  "sim-sem": ["sem", "json"],
  "sim-hist": ["hist", "json"],
  "sim-1a1": ["r11", "json"],
  "sim-mes": ["mes", "str"],
  "sim-cal": ["cal", "str"],
};

/** Campos que nunca saem do aparelho. */
const NUNCA_GRAVAR = ["sal"];

/** Conteúdo de simulador_estado.dados. */
export type Dados = {
  campos?: Campos;
  mes?: string;
  cal?: string;
  [k: string]: unknown;
};

export type Perfil = {
  nome: string;
  nucleo: string | null;
  avatar_emoji: string | null;
  foto_path: string | null;
  onboarding_concluido: boolean;
};
export type PerfilPatch = Partial<Perfil>;

export interface Backend {
  saveEstado(mes: string, dados: Dados): Promise<void>;
  saveResumo(resumo: Resumo): Promise<void>;
  saveProfile(patch: PerfilPatch): Promise<void>;
  /** Envia a foto (data URL) e devolve o caminho no bucket. */
  uploadFoto(dataUrl: string): Promise<string>;
  removeFoto(path: string): Promise<void>;
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export type StoreInit = {
  mes: string;
  dados: Dados;
  perfil: Perfil;
  /** URL para exibir a foto atual (assinada), se houver. */
  fotoUrl: string | null;
  /** Admin pode trocar o núcleo; consultor só define uma vez. */
  podeTrocarNucleo: boolean;
  backend: Backend;
  /** localStorage real (sim-som etc. e cache offline). */
  local: KV | null;
  cacheKey: string;
  debounceMs?: number;
  retryMs?: number;
  onErro?: ((e: unknown) => void) | undefined;
  onSalvo?: (() => void) | undefined;
  onNucleoDefinido?: ((nucleo: string) => void) | undefined;
};

export type CacheEntry = { mes: string; dados: Dados; dirty: boolean; at: number };

export function lerCache(local: KV | null, key: string): CacheEntry | null {
  try {
    const raw = local?.getItem(key);
    if (!raw) return null;
    const c = JSON.parse(raw) as CacheEntry;
    return c && typeof c === "object" && c.dados ? c : null;
  } catch {
    return null;
  }
}

/** Escolhe os dados iniciais: banco, salvo se houver alterações locais ainda não enviadas (offline). */
export function escolherDados(
  servidor: { dados: Dados; updated_at: string } | null,
  cache: CacheEntry | null,
  mes: string,
): { dados: Dados; origem: "servidor" | "cache" | "vazio"; pendente: boolean } {
  const cacheValido = cache && cache.mes === mes ? cache : null;
  if (cacheValido?.dirty && (!servidor || cacheValido.at > Date.parse(servidor.updated_at)))
    return { dados: cacheValido.dados, origem: "cache", pendente: true };
  if (servidor) return { dados: servidor.dados ?? {}, origem: "servidor", pendente: false };
  if (cacheValido)
    return { dados: cacheValido.dados, origem: "cache", pendente: cacheValido.dirty };
  return { dados: {}, origem: "vazio", pendente: false };
}

/** Campos do formulário sem o que não pode ser gravado. */
export function limparCampos(c: Campos): Campos {
  const o: Campos = { ...c };
  NUNCA_GRAVAR.forEach((k) => delete o[k]);
  return o;
}

export function createStore(init: StoreInit) {
  const { mes, backend, local, cacheKey } = init;
  const debounceMs = init.debounceMs ?? 1000,
    retryMs = init.retryMs ?? 15000;
  const dados: Dados = { ...init.dados };
  const perfil: Perfil = { ...init.perfil };
  let fotoUrl = init.fotoUrl;
  let ver = 0,
    estadoDirty = false,
    patch: PerfilPatch = {},
    fotoNova: string | null = null,
    fotoApagar: string | null = null,
    timer: ReturnType<typeof setTimeout> | null = null,
    voando: Promise<void> | null = null,
    falhou = false;

  const nucleoTravado = () => !init.podeTrocarNucleo && !!perfil.nucleo;

  function gravarCache(dirty: boolean) {
    try {
      local?.setItem(
        cacheKey,
        JSON.stringify({ mes, dados, dirty, at: Date.now() } satisfies CacheEntry),
      );
    } catch {
      /* cache é opcional */
    }
  }

  function agendar(ms = debounceMs) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, ms);
  }

  function mudouEstado() {
    ver++;
    estadoDirty = true;
    gravarCache(true);
    agendar();
  }

  function mudouPerfil(p: PerfilPatch) {
    Object.assign(perfil, p);
    Object.assign(patch, p);
    agendar();
  }

  function camposAtuais(): Campos {
    const c = (dados.campos as Campos) || {};
    return { ...c, nome: perfil.nome, nucSel: perfil.nucleo ?? (c.nucSel as string) ?? "" };
  }

  function get(k: string): string | null {
    const d = DOC_KEYS[k];
    if (d) {
      if (k === CAMPOS_KEY)
        return dados.campos || perfil.nome || perfil.nucleo ? JSON.stringify(camposAtuais()) : null;
      const x = dados[d[0]];
      if (x == null) return null;
      return d[1] === "json" ? JSON.stringify(x) : String(x);
    }
    if (k === "sim-avatar") return perfil.avatar_emoji;
    if (k === "sim-onb") return perfil.onboarding_concluido ? "1" : null;
    if (k === "sim-foto") return fotoUrl;
    try {
      return local?.getItem(k) ?? null;
    } catch {
      return null;
    }
  }

  function set(k: string, val: string) {
    const d = DOC_KEYS[k];
    if (d) {
      let x: unknown = val;
      if (d[1] === "json") {
        try {
          x = JSON.parse(val);
        } catch {
          return;
        }
      }
      if (k === CAMPOS_KEY && x && typeof x === "object") {
        const c = limparCampos(x as Campos);
        const nome = typeof c.nome === "string" ? c.nome.trim() : undefined;
        if (nome !== undefined && nome !== perfil.nome) mudouPerfil({ nome });
        const nuc = typeof c.nucSel === "string" ? c.nucSel : "";
        if (nuc && nuc !== perfil.nucleo && !nucleoTravado()) {
          mudouPerfil({ nucleo: nuc });
          init.onNucleoDefinido?.(nuc);
        }
        x = c;
      }
      if (JSON.stringify(dados[d[0]]) === JSON.stringify(x)) return;
      dados[d[0]] = x;
      mudouEstado();
      return;
    }
    if (k === "sim-avatar") {
      if (perfil.avatar_emoji !== val) mudouPerfil({ avatar_emoji: val });
      return;
    }
    if (k === "sim-onb") {
      if (!perfil.onboarding_concluido) mudouPerfil({ onboarding_concluido: true });
      return;
    }
    if (k === "sim-foto") {
      fotoUrl = val;
      fotoNova = val;
      agendar();
      return;
    }
    try {
      local?.setItem(k, val);
    } catch {
      /* sem armazenamento local */
    }
  }

  function del(k: string) {
    const d = DOC_KEYS[k];
    if (d) {
      if (!(d[0] in dados)) return;
      delete dados[d[0]];
      mudouEstado();
      return;
    }
    if (k === "sim-avatar") return mudouPerfil({ avatar_emoji: null });
    if (k === "sim-onb") return mudouPerfil({ onboarding_concluido: false });
    if (k === "sim-foto") {
      fotoUrl = null;
      fotoNova = null;
      if (perfil.foto_path) fotoApagar = perfil.foto_path;
      mudouPerfil({ foto_path: null });
      return;
    }
    try {
      local?.removeItem(k);
    } catch {
      /* sem armazenamento local */
    }
  }

  async function enviar() {
    // 1) estado + resumo
    if (estadoDirty) {
      const v0 = ver,
        snap = JSON.parse(JSON.stringify(dados)) as Dados;
      await backend.saveEstado(mes, snap);
      await backend.saveResumo(calcResumo(limparCampos(camposAtuais()), mes));
      if (ver === v0) {
        estadoDirty = false;
        gravarCache(false);
      }
    }
    // 2) foto
    if (fotoNova) {
      const url = fotoNova;
      const antiga = perfil.foto_path;
      const path = await backend.uploadFoto(url);
      if (fotoNova === url) fotoNova = null;
      Object.assign(perfil, { foto_path: path });
      patch.foto_path = path;
      if (antiga && antiga !== path) fotoApagar = antiga;
    }
    // 3) perfil
    if (Object.keys(patch).length) {
      const p = patch;
      patch = {};
      try {
        await backend.saveProfile(p);
      } catch (e) {
        patch = { ...p, ...patch };
        throw e;
      }
    }
    if (fotoApagar) {
      const a = fotoApagar;
      fotoApagar = null;
      await backend.removeFoto(a).catch(() => undefined);
    }
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (voando) {
      await voando;
      if (!pendente()) return;
    }
    if (!pendente()) return;
    voando = enviar()
      .then(() => {
        if (falhou) falhou = false;
        init.onSalvo?.();
      })
      .catch((e) => {
        if (!falhou) init.onErro?.(e);
        falhou = true;
        agendar(retryMs);
      })
      .finally(() => {
        voando = null;
      });
    await voando;
  }

  const pendente = () => estadoDirty || !!fotoNova || Object.keys(patch).length > 0 || !!fotoApagar;

  /** Marca o estado carregado como pendente (ex.: cópia offline ainda não enviada, ou migração). */
  function marcarPendente() {
    mudouEstado();
  }

  return {
    get,
    set,
    del,
    flush,
    pendente,
    marcarPendente,
    nucleoTravado,
    perfil: () => ({ ...perfil }),
    dados: () => JSON.parse(JSON.stringify(dados)) as Dados,
  };
}

export type SimStore = ReturnType<typeof createStore>;
