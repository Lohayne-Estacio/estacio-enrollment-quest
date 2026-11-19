import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { initSimulador } from "./engine";
import { SIMULADOR_MARKUP } from "./markup";
import { CAMPOS_KEY, createStore, type Backend, type Dados, type KV } from "./persistence";
import { createSimStore, semente } from "./simulacoes";

const mesAtual = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};

function registro(dados: Dados = {}) {
  const estado: Dados[] = [],
    resumos: unknown[] = [],
    perfis: unknown[] = [];
  const backend: Backend = {
    saveEstado: async (_m, d) => void estado.push(d),
    saveResumo: async (r) => void resumos.push(r),
    saveProfile: async (p) => void perfis.push(p),
    uploadFoto: async () => "x/f.jpg",
    removeFoto: async () => {},
  };
  const mem = new Map<string, string>();
  const local: KV = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
  const store = createStore({
    mes: mesAtual(),
    dados,
    perfil: {
      nome: "Ana Souza",
      nucleo: "SP Interior",
      avatar_emoji: null,
      foto_path: null,
      onboarding_concluido: true,
    },
    fotoUrl: null,
    podeTrocarNucleo: false,
    backend,
    local,
    cacheKey: "c",
  });
  return { store, estado, resumos, perfis };
}

describe("semente da simulação", () => {
  it("parte do registro e troca só os campos pelos da simulação salva", () => {
    const reg = { campos: { m0: "10", r0: "4" }, hist: { x: 1 }, mes: "2026-10", cal: "2026-10" };
    expect(semente(reg, "2026-11")).toEqual({ ...reg, mes: "2026-11", cal: "2026-11" });
    expect(semente(reg, "2026-11", { campos: { m0: "20" } })).toMatchObject({
      campos: { m0: "20" },
      hist: { x: 1 },
      mes: "2026-11",
    });
    expect(reg.campos.m0).toBe("10"); // não altera o registro
  });
});

describe("store do modo simulação", () => {
  afterEach(() => void vi.useRealTimers());

  it("mudanças ficam só na memória: nada vai para o estado nem para o resumo", async () => {
    vi.useFakeTimers();
    const r = registro({ campos: { m0: "10" } });
    const s = createSimStore(r.store, semente(r.store.dados(), mesAtual()));
    s.set(CAMPOS_KEY, JSON.stringify({ m0: "10", r0: "9", nome: "Outro", nucSel: "Curitiba" }));
    s.set("sim-dia", JSON.stringify({ n: 9 }));
    await vi.advanceTimersByTimeAsync(3000);
    await r.store.flush();
    expect(r.estado).toEqual([]);
    expect(r.resumos).toEqual([]);
    expect(r.perfis).toEqual([]); // nome/núcleo digitados na simulação não mudam o perfil
    expect(JSON.parse(s.get(CAMPOS_KEY)!)).toEqual({
      m0: "10",
      r0: "9",
      nome: "Ana Souza",
      nucSel: "SP Interior",
    });
    expect(JSON.parse(r.store.get(CAMPOS_KEY)!)).toMatchObject({ m0: "10" });
    expect(JSON.parse(r.store.get(CAMPOS_KEY)!).r0).toBeUndefined();
  });

  it("avatar e onboarding continuam indo para a conta", async () => {
    const r = registro();
    const s = createSimStore(r.store, {});
    s.set("sim-avatar", "🦈");
    await s.flush();
    expect(r.perfis).toEqual([{ avatar_emoji: "🦈" }]);
  });

  it("marca alterações e devolve para salvar só os campos, sem salário", () => {
    const r = registro();
    const s = createSimStore(r.store, semente({}, mesAtual()));
    const ouvinte = vi.fn();
    s.aoAlterar(ouvinte);
    expect(s.alterado()).toBe(false);
    s.set(CAMPOS_KEY, JSON.stringify({ m0: "5", sal: "4321" }));
    expect(s.alterado()).toBe(true);
    expect(ouvinte).toHaveBeenCalledWith(true);
    expect(s.paraSalvar("2026-11")).toEqual({ campos: { m0: "5" }, mes: "2026-11" });
    s.marcarSalvo();
    expect(s.alterado()).toBe(false);
  });
});

describe("engine em modo simulação", () => {
  beforeAll(() => {
    window.matchMedia ??= (q: string) =>
      ({
        matches: false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList;
    window.scrollTo = () => {};
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("carrega a simulação salva, +1 não toca no registro e dá para salvar o cenário", async () => {
    vi.useFakeTimers();
    const r = registro({ campos: { m0: "10", r0: "2" }, mes: mesAtual(), cal: mesAtual() });
    const s = createSimStore(
      r.store,
      semente(r.store.dados(), mesAtual(), { campos: { m0: "10", r0: "7" } }),
    );
    document.body.innerHTML = `<div>${SIMULADOR_MARKUP}</div>`;
    initSimulador(s);
    const r0 = document.getElementById("r0") as HTMLInputElement;
    expect(r0.value).toBe("7");
    (document.querySelector("button.qk.star[data-id='r0']") as HTMLButtonElement).click();
    expect(r0.value).toBe("8");
    await vi.advanceTimersByTimeAsync(3000);
    await r.store.flush();
    expect(r.estado).toEqual([]);
    expect(r.resumos).toEqual([]);
    expect(s.alterado()).toBe(true);
    expect(s.paraSalvar(mesAtual()).campos).toMatchObject({ m0: "10", r0: "8" });
    expect(JSON.parse(r.store.get(CAMPOS_KEY)!)).toMatchObject({ r0: "2" });
  });
});
