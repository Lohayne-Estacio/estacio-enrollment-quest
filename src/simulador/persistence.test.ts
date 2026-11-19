import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lerLegado } from "./migracao";
import {
  CAMPOS_KEY,
  createStore,
  escolherDados,
  lerCache,
  type Backend,
  type KV,
  type Perfil,
  type StoreInit,
} from "./persistence";

const memKV = (init: Record<string, string> = {}): KV & { m: Map<string, string> } => {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
};

const fakeBackend = () => {
  const b = {
    estado: [] as [string, Record<string, unknown>][],
    resumo: [] as unknown[],
    perfil: [] as unknown[],
    fotos: [] as string[],
    removidas: [] as string[],
    falhar: false,
    saveEstado: vi.fn(async (mes: string, dados: Record<string, unknown>) => {
      if (b.falhar) throw new Error("offline");
      b.estado.push([mes, dados]);
    }),
    saveResumo: vi.fn(async (r: unknown) => void b.resumo.push(r)),
    saveProfile: vi.fn(async (p: unknown) => {
      if (b.falhar) throw new Error("offline");
      b.perfil.push(p);
    }),
    uploadFoto: vi.fn(async (u: string) => {
      b.fotos.push(u);
      return `uid/avatar-${b.fotos.length}.jpg`;
    }),
    removeFoto: vi.fn(async (p: string) => void b.removidas.push(p)),
  };
  return b satisfies Backend;
};

const PERFIL: Perfil = {
  nome: "Ana Souza",
  nucleo: "SP Interior",
  avatar_emoji: null,
  foto_path: null,
  onboarding_concluido: false,
};

function novo(over: Partial<StoreInit> = {}) {
  const backend = fakeBackend();
  const local = memKV();
  const store = createStore({
    mes: "2026-11",
    dados: {},
    perfil: PERFIL,
    fotoUrl: null,
    podeTrocarNucleo: false,
    backend,
    local,
    cacheKey: "cache",
    debounceMs: 1000,
    ...over,
  });
  return { store, backend, local };
}

describe("adaptador de persistência", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("grava no banco com debounce de ~1 s, uma vez para várias alterações", async () => {
    const { store, backend } = novo();
    store.set(CAMPOS_KEY, JSON.stringify({ m0: "10", r0: "1" }));
    store.set(CAMPOS_KEY, JSON.stringify({ m0: "10", r0: "2" }));
    store.set("sim-dia", JSON.stringify({ date: "2026-11-19", n: 2 }));
    await vi.advanceTimersByTimeAsync(900);
    expect(backend.saveEstado).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(backend.saveEstado).toHaveBeenCalledTimes(1);
    const [mes, dados] = backend.estado[0]!;
    expect(mes).toBe("2026-11");
    expect(dados).toMatchObject({
      campos: { m0: "10", r0: "2" },
      dia: { date: "2026-11-19", n: 2 },
    });
  });

  it("a cada salvamento faz upsert do resumo calculado", async () => {
    const { store, backend } = novo();
    store.set(CAMPOS_KEY, JSON.stringify({ m0: "10", r0: "10" }));
    await store.flush();
    expect(backend.saveResumo).toHaveBeenCalledTimes(1);
    expect(backend.resumo[0]).toMatchObject({
      mes: "2026-11",
      meta_grad: 10,
      realizado_grad: 10,
      rv_total: 800,
    });
  });

  it("nunca grava o salário-base", async () => {
    const { store, backend, local } = novo();
    store.set(CAMPOS_KEY, JSON.stringify({ m0: "1", sal: "4321" }));
    await store.flush();
    expect(JSON.stringify(backend.estado)).not.toContain("4321");
    expect(JSON.stringify(backend.resumo)).not.toContain("4321");
    expect([...local.m.values()].join()).not.toContain("4321");
  });

  it("get devolve o formato que o engine espera, com nome e núcleo do perfil", () => {
    const { store } = novo({ dados: { campos: { m0: "3", nome: "antigo" }, mes: "2026-11" } });
    expect(JSON.parse(store.get(CAMPOS_KEY)!)).toEqual({
      m0: "3",
      nome: "Ana Souza",
      nucSel: "SP Interior",
    });
    expect(store.get("sim-mes")).toBe("2026-11");
    expect(store.get("sim-hist")).toBeNull();
  });

  it("nome vai para o perfil; núcleo do consultor fica travado depois de definido", async () => {
    const { store, backend } = novo();
    store.set(CAMPOS_KEY, JSON.stringify({ nome: "Ana S.", nucSel: "Curitiba" }));
    await store.flush();
    expect(backend.perfil).toEqual([{ nome: "Ana S." }]);
    expect(store.perfil().nucleo).toBe("SP Interior");
  });

  it("consultor sem núcleo define uma vez; admin pode trocar", async () => {
    const definido = vi.fn();
    const a = novo({ perfil: { ...PERFIL, nucleo: null }, onNucleoDefinido: definido });
    expect(a.store.nucleoTravado()).toBe(false);
    a.store.set(CAMPOS_KEY, JSON.stringify({ nome: PERFIL.nome, nucSel: "Londrina" }));
    await a.store.flush();
    expect(a.backend.perfil).toEqual([{ nucleo: "Londrina" }]);
    expect(definido).toHaveBeenCalledWith("Londrina");
    expect(a.store.nucleoTravado()).toBe(true);

    const b = novo({ podeTrocarNucleo: true });
    b.store.set(CAMPOS_KEY, JSON.stringify({ nome: PERFIL.nome, nucSel: "Londrina" }));
    await b.store.flush();
    expect(b.backend.perfil).toEqual([{ nucleo: "Londrina" }]);
  });

  it("avatar e onboarding vão para o perfil; sim-som continua no aparelho", async () => {
    const { store, backend, local } = novo();
    store.set("sim-avatar", "🦈");
    store.set("sim-onb", "1");
    store.set("sim-som", "0");
    expect(store.get("sim-avatar")).toBe("🦈");
    expect(store.get("sim-onb")).toBe("1");
    expect(local.getItem("sim-som")).toBe("0");
    await store.flush();
    expect(backend.perfil).toEqual([{ avatar_emoji: "🦈", onboarding_concluido: true }]);
    expect(backend.saveEstado).not.toHaveBeenCalled();
  });

  it("foto sobe para o bucket e troca o foto_path; remover apaga o arquivo", async () => {
    const { store, backend } = novo({
      perfil: { ...PERFIL, foto_path: "uid/velha.jpg" },
      fotoUrl: "https://assinada",
    });
    expect(store.get("sim-foto")).toBe("https://assinada");
    store.set("sim-foto", "data:image/jpeg;base64,AAA");
    expect(store.get("sim-foto")).toBe("data:image/jpeg;base64,AAA");
    await store.flush();
    expect(backend.fotos).toEqual(["data:image/jpeg;base64,AAA"]);
    expect(backend.perfil).toEqual([{ foto_path: "uid/avatar-1.jpg" }]);
    expect(backend.removidas).toEqual(["uid/velha.jpg"]);

    store.del("sim-foto");
    await store.flush();
    expect(store.get("sim-foto")).toBeNull();
    expect(backend.perfil.at(-1)).toEqual({ foto_path: null });
    expect(backend.removidas).toEqual(["uid/velha.jpg", "uid/avatar-1.jpg"]);
  });

  it("del de chave do estado remove o campo e salva (zerar / apagar tudo)", async () => {
    const { store, backend } = novo({ dados: { sem: { week: "x" }, hist: { "2026-10": {} } } });
    store.del("sim-sem");
    await store.flush();
    expect(backend.estado[0]![1]).toEqual({ hist: { "2026-10": {} } });
  });

  it("offline: mantém pendente no cache local, avisa uma vez e tenta de novo", async () => {
    const erro = vi.fn();
    const { store, backend, local } = novo({ onErro: erro, retryMs: 5000 });
    backend.falhar = true;
    store.set(CAMPOS_KEY, JSON.stringify({ m0: "7" }));
    expect(lerCache(local, "cache")).toMatchObject({
      mes: "2026-11",
      dirty: true,
      dados: { campos: { m0: "7" } },
    });
    await store.flush();
    expect(erro).toHaveBeenCalledTimes(1);
    expect(store.pendente()).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(erro).toHaveBeenCalledTimes(1);
    backend.falhar = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(store.pendente()).toBe(false);
    expect(lerCache(local, "cache")?.dirty).toBe(false);
    expect(backend.estado.at(-1)![1]).toMatchObject({ campos: { m0: "7" } });
  });

  it("valor igual ao atual não gera gravação", async () => {
    const { store, backend } = novo({ dados: { cal: "2026-11" } });
    store.set("sim-cal", "2026-11");
    await vi.advanceTimersByTimeAsync(2000);
    expect(backend.saveEstado).not.toHaveBeenCalled();
  });
});

describe("escolherDados", () => {
  const srv = { dados: { campos: { m0: "1" } }, updated_at: "2026-11-19T10:00:00Z" };
  it("usa o banco quando não há alteração local pendente", () => {
    expect(
      escolherDados(
        srv,
        { mes: "2026-11", dados: { x: 1 }, dirty: false, at: Date.now() },
        "2026-11",
      ),
    ).toEqual({
      dados: srv.dados,
      origem: "servidor",
      pendente: false,
    });
  });
  it("prefere a cópia local pendente mais nova que o banco", () => {
    const c = {
      mes: "2026-11",
      dados: { x: 2 },
      dirty: true,
      at: Date.parse("2026-11-19T11:00:00Z"),
    };
    expect(escolherDados(srv, c, "2026-11")).toMatchObject({
      dados: { x: 2 },
      origem: "cache",
      pendente: true,
    });
  });
  it("ignora cache de outro mês", () => {
    const c = { mes: "2026-10", dados: { x: 3 }, dirty: true, at: Date.now() };
    expect(escolherDados(null, c, "2026-11")).toEqual({
      dados: {},
      origem: "vazio",
      pendente: false,
    });
  });
});

describe("migração do localStorage antigo", () => {
  it("lê as chaves antigas, converte BH 1/BH 2 e descarta o salário", () => {
    const local = memKV({
      [CAMPOS_KEY]: JSON.stringify({ nome: " Ana ", nucSel: "BH 1", m0: "10", sal: "3000" }),
      "sim-dia": JSON.stringify({ date: "2026-11-18", n: 3 }),
      "sim-hist": JSON.stringify({ "2026-10": { 5: { tot: 100, p: 40 } } }),
      "sim-1a1": JSON.stringify({ pbi: "sim", ap: [], note: "x" }),
      "sim-avatar": "foto",
      "sim-foto": "data:image/jpeg;base64,BBB",
      "sim-onb": "1",
      "sim-mes": "2026-10",
    });
    const l = lerLegado(local)!;
    expect(l.nome).toBe("Ana");
    expect(l.nucleo).toBe("BH - Central");
    expect(l.avatar).toBe("foto");
    expect(l.foto).toBe("data:image/jpeg;base64,BBB");
    expect(l.onboarding).toBe(true);
    expect(l.dados).toMatchObject({
      campos: { m0: "10", nucSel: "BH - Central" },
      dia: { n: 3 },
      hist: { "2026-10": {} },
      r11: { pbi: "sim" },
      mes: "2026-10",
    });
    expect(JSON.stringify(l.dados)).not.toContain("3000");
    expect(lerLegado(memKV({ [CAMPOS_KEY]: JSON.stringify({ nucSel: "BH 2" }) }))!.nucleo).toBe(
      "BH - Metropolitano",
    );
  });
  it("sem chaves antigas não há o que importar", () => {
    expect(lerLegado(memKV({ "sim-som": "1" }))).toBeNull();
  });
});
