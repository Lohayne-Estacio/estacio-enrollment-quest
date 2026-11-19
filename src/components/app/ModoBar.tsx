import { useEffect, useState } from "react";

import { urlModo, type Modo } from "@/simulador/modo";

import {
  dataHora,
  excluirSimulacao,
  nomePadrao,
  salvarSimulacao,
  type SimModoStore,
  type SimulacaoResumo,
} from "@/simulador/simulacoes";

type Props = {
  modo: Modo;
  simId: string | null;
  lista: SimulacaoResumo[];
  simStore: SimModoStore | null;
  mes: string;
  /** Antes de trocar de tela: garante que o registro foi enviado. */
  antesDeSair: () => Promise<void>;
  toast: (t: string) => void;
};

export function ModoBar({
  modo,
  simId: simIdInicial,
  lista: listaInicial,
  simStore,
  mes,
  antesDeSair,
  toast,
}: Props) {
  const [simId, setSimId] = useState(simIdInicial);
  const [lista, setLista] = useState(listaInicial);
  const atual = lista.find((s) => s.id === simId) ?? null;
  const [nome, setNome] = useState(atual?.nome ?? nomePadrao());
  const [alterado, setAlterado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    simStore?.aoAlterar(setAlterado);
  }, [simStore]);

  // Aviso do navegador ao fechar a aba com simulação não salva.
  useEffect(() => {
    if (modo !== "sim") return;
    const h = (e: BeforeUnloadEvent) => {
      if (simStore?.alterado()) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [modo, simStore]);

  async function ir(m: Modo, id?: string | null) {
    if (
      simStore?.alterado() &&
      !window.confirm("Descartar as alterações desta simulação que ainda não foram salvas?")
    )
      return;
    simStore?.marcarSalvo(); // evita o aviso de novo no beforeunload
    await antesDeSair();
    window.location.assign(urlModo(m, id));
  }

  async function salvar(comoNova: boolean) {
    if (!simStore) return;
    const n = nome.trim();
    if (!n) return toast("✏️ Dê um nome para a simulação.");
    setOcupado(true);
    try {
      const s = await salvarSimulacao({
        id: comoNova ? null : simId,
        nome: n,
        dados: simStore.paraSalvar(mes),
      });
      setLista((l) => [s, ...l.filter((x) => x.id !== s.id)]);
      setSimId(s.id);
      setNome(s.nome);
      simStore.marcarSalvo();
      window.history.replaceState(null, "", urlModo("sim", s.id));
      toast(`💾 Simulação “${s.nome}” salva em ${dataHora(s.updated_at)}`);
    } catch {
      toast("⚠️ Não foi possível salvar a simulação. Verifique a conexão e tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (
      !atual ||
      !window.confirm(`Excluir a simulação “${atual.nome}”? Isso não pode ser desfeito.`)
    )
      return;
    setOcupado(true);
    try {
      await excluirSimulacao(atual.id);
      simStore?.marcarSalvo();
      window.location.assign(urlModo("sim"));
    } catch {
      setOcupado(false);
      toast("⚠️ Não foi possível excluir agora.");
    }
  }

  const status = alterado
    ? "✏️ Alterações não salvas"
    : atual
      ? `Salva em ${dataHora(atual.updated_at)}`
      : "Ainda não salva";

  return (
    <section className={modo === "sim" ? "ax-modo sim" : "ax-modo"} aria-label="Modo do simulador">
      <div className="ax-modo-tabs" role="group" aria-label="Modo">
        <button
          type="button"
          aria-pressed={modo === "registro"}
          onClick={() => modo !== "registro" && void ir("registro")}
        >
          📋 Registro
        </button>
        <button
          type="button"
          aria-pressed={modo === "sim"}
          onClick={() => modo !== "sim" && void ir("sim")}
        >
          🧪 Simulação
        </button>
      </div>

      {modo === "registro" ? (
        <p className="ax-modo-txt">
          <b>Modo registro:</b> sua produção real do mês, salva automaticamente. É o que conta no
          ranking do núcleo.
        </p>
      ) : (
        <div className="ax-modo-sim">
          <p className="ax-modo-txt">
            <b>Modo simulação:</b> teste cenários à vontade. Nada aqui entra no seu registro nem no
            ranking.
          </p>
          <div className="ax-modo-row">
            <label className="ax-modo-f">
              <span>Simulação</span>
              <select
                value={simId ?? ""}
                onChange={(e) => void ir("sim", e.target.value || null)}
                disabled={ocupado}
              >
                <option value="">➕ Nova (a partir do registro)</option>
                {lista.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} · {dataHora(s.updated_at)}
                  </option>
                ))}
              </select>
            </label>
            <label className="ax-modo-f">
              <span>Nome</span>
              <input
                value={nome}
                maxLength={60}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Meta 120%"
              />
            </label>
          </div>
          <div className="ax-modo-row">
            <button
              type="button"
              className="ax-modo-btn pri"
              disabled={ocupado}
              onClick={() => void salvar(false)}
            >
              💾 {simId ? "Salvar" : "Salvar simulação"}
            </button>
            {simId ? (
              <>
                <button
                  type="button"
                  className="ax-modo-btn"
                  disabled={ocupado}
                  onClick={() => void salvar(true)}
                >
                  Salvar como nova
                </button>
                <button
                  type="button"
                  className="ax-modo-btn del"
                  disabled={ocupado}
                  onClick={() => void excluir()}
                >
                  🗑️ Excluir
                </button>
              </>
            ) : null}
            <span className="ax-modo-st" role="status">
              {status}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
