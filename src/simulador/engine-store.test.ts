import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { initSimulador } from "./engine";
import { SIMULADOR_MARKUP } from "./markup";
import { CAMPOS_KEY, createStore, type Backend, type Dados, type KV } from "./persistence";

// Integração: engine original + markup + adaptador, com backend em memória.
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

const mesAtual = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};

function montar(dados: Dados, nucleo: string | null = "SP Interior") {
  vi.useFakeTimers();
  const salvos: Dados[] = [];
  const resumos: unknown[] = [];
  const perfis: unknown[] = [];
  const backend: Backend = {
    saveEstado: async (_m, d) => void salvos.push(d),
    saveResumo: async (r) => void resumos.push(r),
    saveProfile: async (p) => void perfis.push(p),
    uploadFoto: async () => "x/foto.jpg",
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
      nucleo,
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
  document.body.innerHTML = `<div>${SIMULADOR_MARKUP}</div>`;
  for (const id of ["nucSel", "obNuc"]) {
    const s = document.getElementById(id) as HTMLSelectElement;
    ["SP Interior", "Curitiba", "BH - Central"].forEach((n) => s.add(new Option(n, n)));
    s.disabled = store.nucleoTravado(); // como em routes/index.tsx
  }
  const api = initSimulador(store);
  return { store, salvos, resumos, perfis, api, mem };
}

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) =>
  document.getElementById(id) as T;

describe("engine + adaptador", () => {
  it("restaura do banco, preenche nome/núcleo do perfil e grava +1 com debounce", async () => {
    const { store, salvos, resumos } = montar({
      campos: { m0: "10", r0: "2", du: "20", dec: "10" },
      mes: mesAtual(),
      cal: mesAtual(),
    });
    expect($("nome").value).toBe("Ana Souza");
    expect($<HTMLSelectElement>("nucSel").value).toBe("SP Interior");
    expect($("m0").value).toBe("10");
    expect($("r0").value).toBe("2");

    const antes = salvos.length;
    (document.querySelector("button.qk.star[data-id='r0']") as HTMLButtonElement).click();
    expect($("r0").value).toBe("3");
    await vi.advanceTimersByTimeAsync(1100);
    await store.flush();
    expect(salvos.length).toBeGreaterThan(antes);
    expect(salvos.at(-1)!.campos).toMatchObject({ m0: "10", r0: "3" });
    expect(resumos.at(-1)).toMatchObject({ meta_grad: 10, realizado_grad: 3 });
  });

  it("nunca grava o salário-base digitado", async () => {
    const { store, salvos, mem } = montar({ campos: { m9: "5" }, mes: mesAtual() });
    const ed = document.querySelector("input[data-to='sal']") as HTMLInputElement;
    ed.value = "4321";
    ed.dispatchEvent(new Event("change", { bubbles: true }));
    expect($("sal").value).toBe("4321");
    await vi.advanceTimersByTimeAsync(1100);
    await store.flush();
    expect(JSON.stringify(salvos)).not.toContain("4321");
    expect([...mem.values()].join()).not.toContain("4321");
  });

  it("virada do mês: parte do mês anterior, zera números e mantém histórico", async () => {
    const { store, salvos, api } = montar({
      campos: { m0: "10", r0: "8", nm: "100", nr: "90" },
      mes: "2000-01",
      hist: { "2000-01": { 5: { tot: 100, p: 80 } } },
    });
    expect(typeof api.toast).toBe("function");
    expect($("m0").value).toBe("0");
    expect($("r0").value).toBe("0");
    await vi.advanceTimersByTimeAsync(1100);
    await store.flush();
    const d = salvos.at(-1)!;
    expect(d.mes).toBe(mesAtual());
    expect(d.campos).toMatchObject({ m0: "0", r0: "0", nm: "0", nr: "0" });
    expect(d["hist"]).toMatchObject({ "2000-01": {} });
  });

  it("zerar números grava no banco", async () => {
    const { store, salvos } = montar({ campos: { m0: "10", r0: "5" }, mes: mesAtual() });
    $<HTMLButtonElement>("zerar").click();
    $<HTMLButtonElement>("zerar").click();
    await vi.advanceTimersByTimeAsync(1100);
    await store.flush();
    expect(salvos.at(-1)!.campos).toMatchObject({ m0: "0", r0: "0" });
  });

  it("?nucleo= no link não troca núcleo travado", () => {
    history.replaceState(null, "", "/?nucleo=Curitiba");
    const { store } = montar({ mes: mesAtual() });
    expect(store.get(CAMPOS_KEY)).toContain("SP Interior");
    history.replaceState(null, "", "/");
  });
});
