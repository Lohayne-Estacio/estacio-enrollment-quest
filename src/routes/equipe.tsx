import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import axCss from "@/app/app.css?url";
import { Msg } from "@/components/app/AuthShell";
import { Restrito, TopoPainel } from "@/components/app/Restrito";
import type { AppRole } from "@/lib/database.types";
import {
  faixaGrad,
  faixaPos,
  nivel,
  nomeMes,
  ordenar,
  paraCsv,
  totais,
  ultimosMeses,
  type Coluna,
  type LinhaEquipe,
} from "@/lib/equipe";
import { listarNucleos } from "@/lib/nucleos";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [{ title: "Equipe · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: () => (
    <Restrito papeis={["gestor", "admin"]}>
      {({ session, papeis }) => (
        <Equipe uid={session.user.id} email={session.user.email} papeis={papeis} />
      )}
    </Restrito>
  ),
});

const brl = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const pc = (n: number) => Math.round(n) + "%";
const mult = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "×";

const COLS: { c: Coluna; t: string; l?: boolean }[] = [
  { c: "nome", t: "Consultor", l: true },
  { c: "nucleo", t: "Núcleo", l: true },
  { c: "realizado_grad", t: "Matr. grad." },
  { c: "atingimento_grad_pct", t: "% ating." },
  { c: "faixa_grad", t: "Faixa / nível", l: true },
  { c: "rv_total", t: "RV total*" },
  { c: "rv_antecipacao", t: "60%*" },
  { c: "rv_saldo", t: "40%*" },
  { c: "faixa_pos", t: "Faixa pós", l: true },
  { c: "rvv_pos_multiplo", t: "Múlt. RVV" },
];

function Equipe({
  uid,
  email,
  papeis,
}: {
  uid: string;
  email?: string | undefined;
  papeis: AppRole[];
}) {
  const admin = papeis.includes("admin");
  const meses = useMemo(() => ultimosMeses(3), []);
  const [mes, setMes] = useState(meses[0]!);
  const [meusNucleos, setMeusNucleos] = useState<string[] | null>(null);
  const [filtro, setFiltro] = useState<string>("");
  const [linhas, setLinhas] = useState<LinhaEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [col, setCol] = useState<Coluna>("atingimento_grad_pct");
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    void (async () => {
      if (admin) return setMeusNucleos(await listarNucleos());
      const { data, error } = await supabase
        .from("gestor_nucleos")
        .select("nucleo")
        .eq("gestor_id", uid);
      if (error) setErro("Não foi possível carregar seus núcleos.");
      setMeusNucleos((data ?? []).map((d) => d.nucleo));
    })();
  }, [admin, uid]);

  useEffect(() => {
    if (!meusNucleos) return;
    if (!meusNucleos.length) {
      setLinhas([]);
      setCarregando(false);
      return;
    }
    let vivo = true;
    setCarregando(true);
    setErro("");
    void (async () => {
      const alvo = filtro ? [filtro] : meusNucleos;
      const { data: perfis, error: e1 } = await supabase
        .from("profiles")
        .select("id, nome, email, nucleo")
        .in("nucleo", alvo)
        .neq("id", uid)
        .order("nome");
      if (e1) {
        if (vivo) {
          setErro("Não foi possível carregar a equipe.");
          setCarregando(false);
        }
        return;
      }
      const ids = (perfis ?? []).map((p) => p.id);
      const res = ids.length
        ? await supabase
            .from("simulador_resumo")
            .select(
              "user_id, meta_grad, realizado_grad, atingimento_grad_pct, faixa_grad, rv_total, rv_antecipacao, rv_saldo, meta_pos, realizado_pos, atingimento_pos_pct, faixa_pos, rvv_pos_multiplo, updated_at",
            )
            .eq("mes", mes)
            .in("user_id", ids)
        : { data: [], error: null };
      if (!vivo) return;
      if (res.error) setErro("Não foi possível carregar os resumos do mês.");
      const porId = new Map((res.data ?? []).map((r) => [r.user_id, r]));
      setLinhas(
        (perfis ?? []).map((p) => ({
          id: p.id,
          nome: p.nome || p.email,
          email: p.email,
          nucleo: p.nucleo ?? "",
          r: porId.get(p.id) ?? null,
        })),
      );
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [meusNucleos, filtro, mes, uid]);

  const vis = useMemo(() => ordenar(linhas, col, asc), [linhas, col, asc]);
  const t = useMemo(() => totais(linhas), [linhas]);

  function clicar(c: Coluna) {
    if (c === col) setAsc(!asc);
    else {
      setCol(c);
      setAsc(c === "nome" || c === "nucleo");
    }
  }

  function exportar() {
    const blob = new Blob([paraCsv(vis, mes)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `equipe-${filtro || "todos"}-${mes}.csv`.replace(/\s+/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="ax">
      <TopoPainel email={email} admin={admin} />
      <main className="ax-page">
        <div className="ax-head">
          <h1>📊 Minha equipe</h1>
          <button
            className="ax-btn ghost sm"
            type="button"
            onClick={exportar}
            disabled={!vis.length}
          >
            ⬇️ Exportar CSV
          </button>
        </div>

        <div className="ax-tools">
          <select
            className="ax-select"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            aria-label="Mês"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
          {meusNucleos && meusNucleos.length > 1 ? (
            <select
              className="ax-select"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              aria-label="Núcleo"
            >
              <option value="">Todos os núcleos ({meusNucleos.length})</option>
              {meusNucleos.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : meusNucleos?.length === 1 ? (
            <span className="ax-pill">{meusNucleos[0]}</span>
          ) : null}
        </div>

        <Msg kind="err">{erro}</Msg>

        {meusNucleos && !meusNucleos.length ? (
          <div className="ax-box ax-empty">
            Nenhum núcleo atribuído a você ainda. Peça a um admin para vincular seus núcleos.
          </div>
        ) : (
          <>
            <div className="ax-kpis">
              <div className="ax-kpi">
                <small>Consultores</small>
                <b>{t.consultores}</b>
                <div className="ax-hint">{t.comDados} com dados no mês</div>
              </div>
              <div className="ax-kpi">
                <small>Matrículas grad.</small>
                <b>{f1(t.realizadoGrad)}</b>
                <div className="ax-hint">de {f1(t.metaGrad)} MF</div>
              </div>
              <div className="ax-kpi">
                <small>% atingimento</small>
                <b>{t.metaGrad ? pc(t.atingimentoGrad) : "–"}</b>
                <div className="ax-hint">{t.noAlvo} em 100%+</div>
              </div>
              <div className="ax-kpi">
                <small>RV total estimada*</small>
                <b>{brl(t.rvTotal)}</b>
                <div className="ax-hint">
                  60% {brl(t.rvAntecipacao)} · 40% {brl(t.rvSaldo)}
                </div>
              </div>
              <div className="ax-kpi">
                <small>Pós</small>
                <b>{f1(t.realizadoPos)}</b>
                <div className="ax-hint">
                  de {f1(t.metaPos)} MF{t.metaPos ? ` · ${pc(t.atingimentoPos)}` : ""}
                </div>
              </div>
            </div>

            <div className="ax-tablewrap">
              <table className="ax-table">
                <thead>
                  <tr>
                    {COLS.map(({ c, t: tt, l }) => (
                      <th
                        key={c}
                        className={l ? "l" : undefined}
                        aria-sort={col === c ? (asc ? "ascending" : "descending") : "none"}
                      >
                        <button type="button" onClick={() => clicar(c)}>
                          {tt}
                          {col === c ? (asc ? " ▲" : " ▼") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={COLS.length} className="ax-empty">
                        Carregando…
                      </td>
                    </tr>
                  ) : !vis.length ? (
                    <tr>
                      <td colSpan={COLS.length} className="ax-empty">
                        Nenhum consultor cadastrado nesse núcleo ainda.
                      </td>
                    </tr>
                  ) : (
                    vis.map((l) => (
                      <tr key={l.id}>
                        <td className="l name">
                          {l.nome}
                          <small>{l.email}</small>
                        </td>
                        <td className="l">{l.nucleo}</td>
                        {l.r ? (
                          <>
                            <td>
                              {f1(Number(l.r.realizado_grad))}
                              <span className="ax-hint"> / {f1(Number(l.r.meta_grad))}</span>
                            </td>
                            <td>
                              <span
                                className={
                                  Number(l.r.atingimento_grad_pct) >= 100 ? "ax-pill hi" : "ax-pill"
                                }
                              >
                                {Number(l.r.meta_grad) ? pc(Number(l.r.atingimento_grad_pct)) : "–"}
                              </span>
                            </td>
                            <td className="l">
                              {faixaGrad(l.r.faixa_grad)} · {nivel(l.r.faixa_grad)}
                            </td>
                            <td>{brl(Number(l.r.rv_total))}</td>
                            <td>{brl(Number(l.r.rv_antecipacao))}</td>
                            <td>{brl(Number(l.r.rv_saldo))}</td>
                            <td className="l">
                              {Number(l.r.meta_pos) ? faixaPos(l.r.faixa_pos) : "–"}
                            </td>
                            <td>
                              {Number(l.r.meta_pos) ? mult(Number(l.r.rvv_pos_multiplo)) : "–"}
                            </td>
                          </>
                        ) : (
                          <td colSpan={COLS.length - 2} className="l ax-hint">
                            Sem dados em {nomeMes(mes)}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="ax-hint" style={{ marginTop: 10 }}>
              *Estimativas do simulador, não oficiais. A RVV de pós aparece como múltiplo do
              salário-base (o salário não é gravado). Vale a política de RV vigente.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
