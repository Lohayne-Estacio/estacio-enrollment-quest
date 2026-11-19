import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import axCss from "@/app/app.css?url";
import { Msg } from "@/components/app/AuthShell";
import { Restrito, TopoPainel } from "@/components/app/Restrito";
import type { AppRole, Profile } from "@/lib/database.types";
import { listarNucleos } from "@/lib/nucleos";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: () => (
    <Restrito papeis={["admin"]}>
      {({ session }) => <Admin uid={session.user.id} email={session.user.email} />}
    </Restrito>
  ),
});

type P = Pick<Profile, "id" | "email" | "nome" | "nucleo">;
const PAPEIS: { r: AppRole; t: string }[] = [
  { r: "consultor", t: "Consultor" },
  { r: "gestor", t: "Gestor" },
  { r: "admin", t: "Admin" },
];

function Admin({ uid, email }: { uid: string; email?: string | undefined }) {
  const [nucleos, setNucleos] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [achados, setAchados] = useState<P[] | null>(null);
  const [sel, setSel] = useState<P | null>(null);
  const [equipe, setEquipe] = useState<(P & { papeis: AppRole[] })[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    void listarNucleos().then(setNucleos);
  }, []);

  const carregarEquipe = useCallback(async () => {
    const { data: rs } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["gestor", "admin"]);
    const ids = [...new Set((rs ?? []).map((r) => r.user_id))];
    if (!ids.length) return setEquipe([]);
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, email, nome, nucleo")
      .in("id", ids)
      .order("nome");
    setEquipe(
      (ps ?? []).map((p) => ({
        ...p,
        papeis: (rs ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      })),
    );
  }, []);

  useEffect(() => {
    void carregarEquipe();
  }, [carregarEquipe]);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const termo = q
      .trim()
      .toLowerCase()
      .replace(/[%_,()]/g, "");
    if (termo.length < 3) return setErro("Digite pelo menos 3 letras do e-mail.");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, nome, nucleo")
      .ilike("email", `%${termo}%`)
      .order("email")
      .limit(20);
    if (error) return setErro("Não foi possível buscar agora.");
    setAchados(data ?? []);
    if (data?.length === 1) setSel(data[0]!);
  }

  return (
    <div className="ax">
      <TopoPainel email={email} admin />
      <main className="ax-page">
        <div className="ax-head">
          <h1>🛠️ Admin</h1>
        </div>

        <section className="ax-box">
          <h2>Buscar usuário por e-mail</h2>
          <form className="ax-row" onSubmit={buscar}>
            <label className="ax-field">
              E-mail
              <input
                className="ax-input"
                type="search"
                inputMode="email"
                placeholder="nome@estacio.br"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button className="ax-btn" type="submit">
              Buscar
            </button>
          </form>
          <div style={{ marginTop: 10 }}>
            <Msg kind="err">{erro}</Msg>
          </div>
          {achados ? (
            achados.length ? (
              <ul className="ax-list" style={{ marginTop: 10 }}>
                {achados.map((p) => (
                  <li key={p.id}>
                    <div className="grow">
                      <b>{p.nome || "(sem nome)"}</b>
                      <small>
                        {p.email} · {p.nucleo ?? "sem núcleo"}
                      </small>
                    </div>
                    <button
                      className={sel?.id === p.id ? "ax-btn sm" : "ax-btn ghost sm"}
                      type="button"
                      onClick={() => setSel(p)}
                    >
                      {sel?.id === p.id ? "Selecionado" : "Gerenciar"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ax-hint" style={{ marginTop: 10 }}>
                Nenhum usuário encontrado. A pessoa precisa ter criado a conta (e confirmado o
                e-mail).
              </p>
            )
          ) : null}
        </section>

        {sel ? (
          <Usuario
            key={sel.id}
            p={sel}
            eu={sel.id === uid}
            nucleos={nucleos}
            onMudou={(np) => {
              setSel(np);
              setAchados((a) => a?.map((x) => (x.id === np.id ? np : x)) ?? a);
              void carregarEquipe();
            }}
          />
        ) : null}

        <section className="ax-box">
          <h2>Gestores e admins</h2>
          {equipe.length ? (
            <ul className="ax-list">
              {equipe.map((p) => (
                <li key={p.id}>
                  <div className="grow">
                    <b>{p.nome || p.email}</b>
                    <small>
                      {p.email} · {p.papeis.join(", ")}
                    </small>
                  </div>
                  <button className="ax-btn ghost sm" type="button" onClick={() => setSel(p)}>
                    Gerenciar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ax-hint">Ninguém além dos consultores ainda.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function Usuario({
  p,
  eu,
  nucleos,
  onMudou,
}: {
  p: P;
  eu: boolean;
  nucleos: string[];
  onMudou: (p: P) => void;
}) {
  const [papeis, setPapeis] = useState<AppRole[]>([]);
  const [geridos, setGeridos] = useState<string[]>([]);
  const [nuc, setNuc] = useState(p.nucleo ?? "");
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const [r, g] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", p.id),
      supabase.from("gestor_nucleos").select("nucleo").eq("gestor_id", p.id),
    ]);
    setPapeis((r.data ?? []).map((x) => x.role));
    setGeridos((g.data ?? []).map((x) => x.nucleo));
  }, [p.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function rodar(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setOcupado(true);
    setMsg(null);
    const { error } = await fn();
    setOcupado(false);
    if (error)
      setMsg({ k: "err", t: "Não foi possível salvar. Confira sua permissão e tente de novo." });
    else setMsg({ k: "ok", t: ok });
    await carregar();
    return !error;
  }

  function alternarPapel(r: AppRole) {
    const tem = papeis.includes(r);
    if (eu && r === "admin" && tem)
      return setMsg({ k: "err", t: "Você não pode remover o seu próprio papel de admin." });
    void rodar(
      () =>
        tem
          ? supabase.from("user_roles").delete().eq("user_id", p.id).eq("role", r)
          : supabase.from("user_roles").insert({ user_id: p.id, role: r }),
      tem ? `Papel ${r} removido.` : `Papel ${r} adicionado.`,
    ).then(() => onMudou(p));
  }

  function alternarNucleo(n: string) {
    const tem = geridos.includes(n);
    void rodar(
      () =>
        tem
          ? supabase.from("gestor_nucleos").delete().eq("gestor_id", p.id).eq("nucleo", n)
          : supabase.from("gestor_nucleos").insert({ gestor_id: p.id, nucleo: n }),
      tem ? `${n} removido dos núcleos acompanhados.` : `${n} adicionado aos núcleos acompanhados.`,
    );
  }

  function salvarNucleo() {
    if (!nuc || nuc === p.nucleo) return;
    void rodar(
      () => supabase.from("profiles").update({ nucleo: nuc }).eq("id", p.id),
      "Núcleo atualizado.",
    ).then((ok) => ok && onMudou({ ...p, nucleo: nuc }));
  }

  const gestor = papeis.includes("gestor");

  return (
    <section className="ax-box" aria-live="polite">
      <h2>
        {p.nome || "(sem nome)"} <span className="ax-hint">{p.email}</span>
      </h2>
      {msg ? <Msg kind={msg.k}>{msg.t}</Msg> : null}

      <div className="ax-field" style={{ marginTop: 12 }}>
        Papéis
        <div className="ax-chips">
          {PAPEIS.map(({ r, t }) => (
            <button
              key={r}
              type="button"
              className={papeis.includes(r) ? "ax-chip on" : "ax-chip"}
              aria-pressed={papeis.includes(r)}
              disabled={ocupado}
              onClick={() => alternarPapel(r)}
            >
              {papeis.includes(r) ? "✓ " : ""}
              {t}
            </button>
          ))}
        </div>
      </div>

      {gestor ? (
        <div className="ax-field" style={{ marginTop: 14 }}>
          Núcleos que acompanha como gestor
          <div className="ax-chips">
            {nucleos.map((n) => (
              <button
                key={n}
                type="button"
                className={geridos.includes(n) ? "ax-chip on" : "ax-chip"}
                aria-pressed={geridos.includes(n)}
                disabled={ocupado}
                onClick={() => alternarNucleo(n)}
              >
                {geridos.includes(n) ? "✓ " : ""}
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="ax-hint" style={{ marginTop: 14 }}>
          Dê o papel de gestor para escolher os núcleos que ele acompanha.
        </p>
      )}

      <div className="ax-row" style={{ marginTop: 14 }}>
        <label className="ax-field">
          Núcleo do consultor
          <select className="ax-select" value={nuc} onChange={(e) => setNuc(e.target.value)}>
            <option value="">Sem núcleo</option>
            {nucleos.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ax-btn"
          type="button"
          disabled={ocupado || !nuc || nuc === p.nucleo}
          onClick={salvarNucleo}
        >
          Salvar núcleo
        </button>
      </div>
    </section>
  );
}
