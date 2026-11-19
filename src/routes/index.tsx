import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import axCss from "@/app/app.css?url";
import { AuthShell, Carregando, Msg } from "@/components/app/AuthShell";
import { sair, temPapel, useSessao } from "@/lib/auth";
import simCss from "@/simulador/simulador.css?url";
import { SIMULADOR_MARKUP } from "@/simulador/markup";
import { carregarSimulador, limparCacheLocal, mesAtual, type Carga } from "@/simulador/cloud";
import { ModoBar } from "@/components/app/ModoBar";
import { lerModo, type Modo } from "@/simulador/modo";
import {
  carregarSimulacao,
  createSimStore,
  listarSimulacoes,
  semente,
  type SimModoStore,
  type SimulacaoResumo,
} from "@/simulador/simulacoes";

type ModoCarga = {
  modo: Modo;
  simId: string | null;
  lista: SimulacaoResumo[];
  simStore: SimModoStore | null;
  avisos: string[];
};

/** Monta o modo pedido na URL. No modo simulação o engine recebe um store em memória. */
async function prepararModo(c: Carga): Promise<ModoCarga> {
  const { modo, simId } = lerModo(window.location.search);
  if (modo === "registro") return { modo, simId: null, lista: [], simStore: null, avisos: [] };
  const avisos: string[] = [];
  const [lista, salva] = await Promise.all([
    listarSimulacoes().catch(() => {
      avisos.push("⚠️ Não foi possível carregar suas simulações salvas.");
      return [] as SimulacaoResumo[];
    }),
    simId ? carregarSimulacao(simId).catch(() => null) : Promise.resolve(null),
  ]);
  if (simId && !salva)
    avisos.push("🔎 Simulação não encontrada. Começando uma nova a partir do registro.");
  const simStore = createSimStore(c.store, semente(c.store.dados(), mesAtual(), salva?.dados));
  return { modo, simId: salva ? simId : null, lista, simStore, avisos };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador do Consultor – Modo Game" },
      {
        name: "description",
        content:
          "Simule sua RV de graduação e a RVV de pós, suba de nível e acompanhe missões. Para consultores comerciais Estácio da regional Centro Sul.",
      },
      { property: "og:title", content: "Simulador do Consultor – Modo Game" },
      {
        property: "og:description",
        content:
          "Cada matrícula vira dinheiro na tela: níveis, missões, Radar do ganho e resumo para o 1:1.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#262a4d" },
    ],
    links: [
      { rel: "stylesheet", href: simCss },
      { rel: "stylesheet", href: axCss },
    ],
  }),
  component: Index,
});

const NUC_SELECTS = ["nucSel", "obNuc"];
const MSG_TRAVADO = "Núcleo da sua conta. Para trocar, fale com um admin.";

function travarNucleo() {
  NUC_SELECTS.forEach((id) => {
    const s = document.getElementById(id) as HTMLSelectElement | null;
    if (!s) return;
    s.disabled = true;
    s.title = MSG_TRAVADO;
  });
}

/** Preenche os seletores de núcleo com a lista do banco (o markup traz só a opção vazia). */
function prepararNucleos(c: Carga) {
  const lista =
    c.perfil.nucleo && !c.nucleos.includes(c.perfil.nucleo)
      ? [...c.nucleos, c.perfil.nucleo]
      : c.nucleos;
  NUC_SELECTS.forEach((id) => {
    const s = document.getElementById(id) as HTMLSelectElement | null;
    if (!s) return;
    while (s.options.length > 1) s.remove(1);
    lista.forEach((n) => s.add(new Option(n, n)));
  });
  if (c.nucleoTravado) travarNucleo();
}

function Index() {
  const nav = useNavigate();
  const { session, carregando } = useSessao();
  const [carga, setCarga] = useState<Carga | null>(null);
  const [modo, setModo] = useState<ModoCarga | null>(null);
  const [erro, setErro] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toastRef = useRef<((t: string) => void) | null>(null);
  const uid = session?.user.id;

  useEffect(() => {
    if (!carregando && !session) void nav({ to: "/login", replace: true });
  }, [carregando, session, nav]);

  useEffect(() => {
    if (!session || !uid) return;
    let vivo = true;
    let admin = false;
    carregarSimulador(session.user, {
      onErro: () =>
        toastRef.current?.(
          "⚠️ Sem conexão: seus números ficam neste aparelho e sobem quando a internet voltar.",
        ),
      onNucleoDefinido: () => {
        if (admin) return;
        travarNucleo();
        toastRef.current?.("🏢 Núcleo salvo na sua conta. Para trocar depois, fale com um admin.");
      },
    })
      .then(async (c) => {
        admin = c.papeis.includes("admin");
        const m = await prepararModo(c);
        if (!vivo) return;
        setModo(m);
        setCarga(c);
      })
      .catch(
        () =>
          vivo &&
          setErro("Não foi possível carregar seus dados. Verifique a conexão e tente de novo."),
      );
    return () => {
      vivo = false;
    };
    // Recarrega só quando muda o usuário (renovação de token não conta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    const el = root.current;
    if (!carga || !modo || !el || el.dataset["init"]) return;
    el.dataset["init"] = "1";
    prepararNucleos(carga);
    void import("@/simulador/engine").then((m) => {
      const api = m.initSimulador(modo.simStore ?? carga.store);
      toastRef.current = api.toast;
      if (carga.migrou)
        api.toast("📦 Seus números deste aparelho foram importados para a sua conta.");
      if (carga.offline)
        api.toast("⚠️ Sem conexão: mostrando a última cópia salva neste aparelho.");
      modo.avisos.forEach((t) => api.toast(t));
    });
  }, [carga, modo]);

  // O engine registra listeners no document: entre telas usamos navegação completa (<a href>), nunca <Link>, para não iniciá-lo duas vezes.
  // Envia o que estiver pendente ao sair da aba e quando a internet volta.
  useEffect(() => {
    if (!carga) return;
    const flush = () => void carga.store.flush();
    const oculto = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", oculto);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", flush);
    return () => {
      document.removeEventListener("visibilitychange", oculto);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", flush);
    };
  }, [carga]);

  async function onSair() {
    if (carga && uid) {
      await carga.store.flush();
      if (!carga.store.pendente()) limparCacheLocal(uid);
    }
    await sair();
  }

  if (erro)
    return (
      <AuthShell title="Ops!">
        <Msg kind="err">{erro}</Msg>
        <div className="ax-links">
          <button
            className="ax-btn ghost sm"
            type="button"
            onClick={() => window.location.reload()}
          >
            Tentar de novo
          </button>
          <button className="ax-btn ghost sm" type="button" onClick={() => void sair()}>
            Sair
          </button>
        </div>
      </AuthShell>
    );
  if (!session || !carga || !modo) return <Carregando texto="Carregando seu jogo…" />;

  return (
    <>
      <nav className={modo.modo === "sim" ? "ax-bar sim" : "ax-bar"} aria-label="Conta">
        <span className="who">{carga.email}</span>
        <a href="/ranking">🏆 Ranking</a>
        {temPapel(carga.papeis, "gestor", "admin") ? <a href="/equipe">📊 Equipe</a> : null}
        {temPapel(carga.papeis, "admin") ? <a href="/admin">🛠️ Admin</a> : null}
        <button type="button" onClick={() => void onSair()}>
          Sair
        </button>
      </nav>
      <ModoBar
        modo={modo.modo}
        simId={modo.simId}
        lista={modo.lista}
        simStore={modo.simStore}
        mes={mesAtual()}
        antesDeSair={() => carga.store.flush()}
        toast={(t) => toastRef.current?.(t)}
      />
      <div ref={root} dangerouslySetInnerHTML={{ __html: SIMULADOR_MARKUP }} />
    </>
  );
}
