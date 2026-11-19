import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import axCss from "@/app/app.css?url";
import { AuthShell, Msg } from "@/components/app/AuthShell";
import { emailPermitido, MSG_DOMINIO, origem, traduzErro } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [{ title: "Recuperar senha · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: Recuperar,
});

function Recuperar() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (!emailPermitido(email)) return setErro(MSG_DOMINIO);
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${origem()}/nova-senha`,
    });
    setEnviando(false);
    if (error) return setErro(traduzErro(error));
    setOk(true);
  }

  return (
    <AuthShell title="Recuperar senha" sub="Enviamos um link para você criar uma senha nova.">
      {ok ? (
        <Msg kind="ok">
          Se houver uma conta com esse e-mail, o link chega em instantes. Confira também o spam.
        </Msg>
      ) : (
        <form className="ax-form" onSubmit={enviar} noValidate>
          <label className="ax-field">
            E-mail corporativo
            <input
              className="ax-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <Msg kind="err">{erro}</Msg>
          <button className="ax-btn" type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
      <div className="ax-links">
        <Link to="/login">Voltar ao login</Link>
      </div>
    </AuthShell>
  );
}
