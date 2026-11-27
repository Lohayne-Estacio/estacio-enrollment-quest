import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Msg } from "@/components/app/AuthShell";
import { emailPermitido, MSG_DOMINIO, origem } from "@/lib/auth";
import {
  expiraEm,
  linkConvite,
  PAPEL_DESCRICAO,
  PAPEL_ROTULO,
  situacaoConvite,
  VALIDADES_DIAS,
  type SituacaoConvite,
} from "@/lib/convites";
import type { AppRole, Convite } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

const PAPEIS: AppRole[] = ["consultor", "gestor", "admin"];

const SITUACAO_ROTULO: Record<SituacaoConvite, string> = {
  pendente: "Aguardando cadastro",
  usado: "Usado",
  expirado: "Expirado",
  revogado: "Cancelado",
};

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

type Aviso = { k: "ok" | "err"; t: string } | null;

/** Admin: gera links de cadastro que já entram com o perfil de acesso escolhido. */
export function Convites() {
  const [papel, setPapel] = useState<AppRole>("consultor");
  const [email, setEmail] = useState("");
  const [dias, setDias] = useState<number>(7);
  const [lista, setLista] = useState<Convite[]>([]);
  const [novo, setNovo] = useState<string | null>(null);
  const [msg, setMsg] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("convites")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setLista(data ?? []);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function copiarLink(link: string) {
    const ok = await copiar(link);
    setMsg(ok ? { k: "ok", t: "Link copiado." } : { k: "err", t: "Copie o link manualmente." });
  }

  async function gerar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setNovo(null);
    const em = email.trim().toLowerCase();
    if (em && !emailPermitido(em)) return setMsg({ k: "err", t: MSG_DOMINIO });
    setOcupado(true);
    const { data, error } = await supabase
      .from("convites")
      .insert({ role: papel, email: em || null, expira_em: expiraEm(dias) })
      .select("id")
      .single();
    setOcupado(false);
    if (error || !data)
      return setMsg({ k: "err", t: "Não foi possível gerar o convite. Tente de novo." });
    const link = linkConvite(origem(), data.id);
    setNovo(link);
    setEmail("");
    const ok = await copiar(link);
    setMsg({
      k: "ok",
      t: ok
        ? `Convite de ${PAPEL_ROTULO[papel]} gerado e copiado. Envie o link para a pessoa.`
        : `Convite de ${PAPEL_ROTULO[papel]} gerado. Copie o link abaixo.`,
    });
    await carregar();
  }

  async function cancelar(c: Convite) {
    setMsg(null);
    const { error } = await supabase.from("convites").update({ revogado: true }).eq("id", c.id);
    setMsg(
      error
        ? { k: "err", t: "Não foi possível cancelar o convite." }
        : { k: "ok", t: "Convite cancelado. O link não dá mais acesso." },
    );
    await carregar();
  }

  return (
    <section className="ax-box" aria-live="polite">
      <h2>Convites de cadastro</h2>
      <p className="ax-hint">
        Gere um link e envie para a pessoa. Ela cria a conta por ele e, ao confirmar o e-mail,
        recebe o perfil de acesso escolhido. Cada link vale para um cadastro só.
      </p>
      <form className="ax-form" onSubmit={gerar} style={{ marginTop: 12 }}>
        <div className="ax-field">
          Perfil de acesso
          <div className="ax-chips" role="radiogroup" aria-label="Perfil de acesso">
            {PAPEIS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={papel === r}
                className={papel === r ? "ax-chip on" : "ax-chip"}
                onClick={() => setPapel(r)}
              >
                {papel === r ? "✓ " : ""}
                {PAPEL_ROTULO[r]}
              </button>
            ))}
          </div>
          <span className="ax-hint">{PAPEL_DESCRICAO[papel]}</span>
        </div>
        <div className="ax-row">
          <label className="ax-field">
            E-mail da pessoa (opcional)
            <input
              className="ax-input"
              type="email"
              inputMode="email"
              placeholder="nome@estacio.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="ax-hint">Se preencher, só esse e-mail consegue usar o convite.</span>
          </label>
          <label className="ax-field">
            Validade
            <select
              className="ax-select"
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
            >
              {VALIDADES_DIAS.map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? "1 dia" : `${d} dias`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="ax-btn" type="submit" disabled={ocupado}>
          {ocupado ? "Gerando…" : "Gerar convite"}
        </button>
      </form>

      {msg ? (
        <div style={{ marginTop: 10 }}>
          <Msg kind={msg.k}>{msg.t}</Msg>
        </div>
      ) : null}

      {novo ? (
        <div className="ax-row" style={{ marginTop: 10 }}>
          <label className="ax-field">
            Link do convite
            <input
              className="ax-input"
              readOnly
              value={novo}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <button className="ax-btn ghost" type="button" onClick={() => void copiarLink(novo)}>
            Copiar
          </button>
        </div>
      ) : null}

      {lista.length ? (
        <ul className="ax-list" style={{ marginTop: 14 }}>
          {lista.map((c) => {
            const sit = situacaoConvite(c);
            return (
              <li key={c.id}>
                <div className="grow">
                  <b>
                    {PAPEL_ROTULO[c.role]} · {SITUACAO_ROTULO[sit]}
                  </b>
                  <small>
                    {c.email ?? "qualquer e-mail corporativo"} · criado em {dataCurta(c.created_at)}
                    {sit === "pendente" ? ` · vale até ${dataCurta(c.expira_em)}` : ""}
                  </small>
                </div>
                {sit === "pendente" ? (
                  <>
                    <button
                      className="ax-btn ghost sm"
                      type="button"
                      onClick={() => void copiarLink(linkConvite(origem(), c.id))}
                    >
                      Copiar link
                    </button>
                    <button
                      className="ax-btn ghost sm"
                      type="button"
                      onClick={() => void cancelar(c)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
