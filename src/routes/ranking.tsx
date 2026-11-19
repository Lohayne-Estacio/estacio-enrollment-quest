import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import axCss from "@/app/app.css?url";
import { Msg } from "@/components/app/AuthShell";
import { Restrito, TopoPainel } from "@/components/app/Restrito";
import type { AppRole, LinhaRanking } from "@/lib/database.types";
import { nivel, nomeMes, ultimosMeses } from "@/lib/equipe";
import { listarNucleos } from "@/lib/nucleos";
import { supabase } from "@/lib/supabase";
import { CONQUISTAS, conquistaPorId } from "@/simulador/conquistas";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [{ title: "Ranking do núcleo · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: () => (
    <Restrito papeis={["consultor", "gestor", "admin"]}>
      {({ session, papeis }) => (
        <Ranking uid={session.user.id} email={session.user.email} papeis={papeis} />
      )}
    </Restrito>
  ),
});

const MEDALHA = ["🥇", "🥈", "🥉"];

/** Avatar do ranking: emoji escolhido ou iniciais (a foto fica privada no bucket). */
function avatar(l: LinhaRanking) {
  const e = l.avatar_emoji;
  if (e && e !== "ini" && e !== "foto") return e;
  const ini = l.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return ini || "🦫";
}

function Ranking({
  uid,
  email,
  papeis,
}: {
  uid: string;
  email?: string | undefined;
  papeis: AppRole[];
}) {
  const admin = papeis.includes("admin");
  const gestor = papeis.includes("gestor");
  const meses = useMemo(() => ultimosMeses(3), []);
  const [mes, setMes] = useState(meses[0]!);
  const [meuNucleo, setMeuNucleo] = useState<string | null | undefined>(undefined);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [nucleo, setNucleo] = useState("");
  const [linhas, setLinhas] = useState<LinhaRanking[] | null>(null);
  const [erro, setErro] = useState("");

  // Núcleos que a pessoa pode ver: o próprio; gestor também os que acompanha; admin todos.
  useEffect(() => {
    void (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("nucleo")
        .eq("id", uid)
        .maybeSingle();
      const proprio = p?.nucleo ?? null;
      let lista = proprio ? [proprio] : [];
      if (admin) lista = await listarNucleos();
      else if (gestor) {
        const { data } = await supabase
          .from("gestor_nucleos")
          .select("nucleo")
          .eq("gestor_id", uid);
        lista = [...new Set([...lista, ...(data ?? []).map((d) => d.nucleo)])];
      }
      setMeuNucleo(proprio);
      setOpcoes(lista);
      setNucleo(proprio ?? lista[0] ?? "");
    })();
  }, [uid, admin, gestor]);

  useEffect(() => {
    if (!nucleo) return;
    let vivo = true;
    setLinhas(null);
    setErro("");
    void supabase.rpc("ranking_nucleo", { _mes: mes, _nucleo: nucleo }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) setErro("Não foi possível carregar o ranking agora.");
      setLinhas((data as LinhaRanking[] | null) ?? []);
    });
    return () => {
      vivo = false;
    };
  }, [mes, nucleo]);

  const eu = linhas?.find((l) => l.eu);

  return (
    <div className="ax">
      <TopoPainel email={email} admin={admin} equipe={admin || gestor} />
      <main className="ax-page">
        <div className="ax-head">
          <h1>🏆 Ranking do núcleo</h1>
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
          {opcoes.length > 1 ? (
            <select
              className="ax-select"
              value={nucleo}
              onChange={(e) => setNucleo(e.target.value)}
              aria-label="Núcleo"
            >
              {opcoes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : nucleo ? (
            <span className="ax-pill">{nucleo}</span>
          ) : null}
        </div>

        <Msg kind="err">{erro}</Msg>

        {meuNucleo === null && !opcoes.length ? (
          <div className="ax-box ax-empty">
            Escolha o seu núcleo no simulador para entrar no ranking.
          </div>
        ) : (
          <>
            {eu ? (
              <div className="ax-box ax-rk-eu">
                Você está em <b>{eu.posicao}º</b> de {linhas!.length} · {nivel(eu.faixa_grad)} ·{" "}
                {eu.conquistas.length}/{CONQUISTAS.length} conquistas
              </div>
            ) : null}

            {linhas === null ? (
              <div className="ax-box ax-empty">Carregando…</div>
            ) : !linhas.length ? (
              <div className="ax-box ax-empty">
                Ninguém no ranking de {nomeMes(mes)} ainda. Entra quem preencher a meta no
                simulador.
              </div>
            ) : (
              <ol className="ax-rk">
                {linhas.map((l, i) => (
                  <li key={`${l.posicao}-${l.nome}-${i}`} className={l.eu ? "eu" : undefined}>
                    <span className="pos" aria-label={`${l.posicao}º lugar`}>
                      {MEDALHA[l.posicao - 1] ?? `${l.posicao}º`}
                    </span>
                    <span className="av" aria-hidden>
                      {avatar(l)}
                    </span>
                    <div className="who">
                      <b>
                        {l.nome || "Consultor(a)"}
                        {l.eu ? " (você)" : ""}
                      </b>
                      <small>
                        {nivel(l.faixa_grad)} · Nível {l.faixa_grad + 1}/7
                      </small>
                      <div className="sel" aria-label="Conquistas">
                        {l.conquistas.map((id) => {
                          const c = conquistaPorId.get(id);
                          return c ? (
                            <span key={id} title={`${c.titulo}: ${c.desc}`}>
                              {c.icone}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <span className="pct">{Math.round(Number(l.atingimento_grad_pct))}%</span>
                  </li>
                ))}
              </ol>
            )}

            <details className="ax-box" style={{ marginTop: 16 }}>
              <summary>Como funciona</summary>
              <p className="ax-hint" style={{ marginTop: 8 }}>
                A posição segue o nível do jogo e, no empate, o % da meta de graduação. Entra quem
                preencheu a meta do mês. O ranking não mostra valores em R$, salário nem notas do
                1:1.
              </p>
              <ul className="ax-hint" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {CONQUISTAS.map((c) => (
                  <li key={c.id}>
                    {c.icone} <b>{c.titulo}</b>: {c.desc}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </main>
    </div>
  );
}
