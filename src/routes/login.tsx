import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import axCss from "@/app/app.css?url";
import { AuthShell, Carregando, Msg } from "@/components/app/AuthShell";
import { emailPermitido, MSG_DOMINIO, traduzErro, useSessao } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { session, carregando } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (session) void nav({ to: "/", replace: true });
  }, [session, nav]);

  if (carregando || session) return <Carregando />;

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (!emailPermitido(email)) return setErro(MSG_DOMINIO);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    setEnviando(false);
    if (error) setErro(traduzErro(error));
  }

  return (
    <AuthShell title="Entrar" sub="Use seu e-mail corporativo para acessar o seu jogo.">
      <form className="ax-form" onSubmit={entrar} noValidate>
        <label className="ax-field">
          E-mail
          <input
            className="ax-input"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nome@estacio.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="ax-field">
          Senha
          <input
            className="ax-input"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        <Msg kind="err">{erro}</Msg>
        <button className="ax-btn" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "🎮 Entrar"}
        </button>
      </form>
      <div className="ax-links">
        <Link to="/cadastro">Criar conta</Link>
        <Link to="/recuperar-senha">Esqueci a senha</Link>
      </div>
    </AuthShell>
  );
}
