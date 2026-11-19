import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import axCss from "@/app/app.css?url";
import { AuthShell, Carregando, Msg } from "@/components/app/AuthShell";
import { SENHA_MIN, traduzErro, useSessao } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/nova-senha")({
  head: () => ({
    meta: [{ title: "Nova senha · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: NovaSenha,
});

function NovaSenha() {
  const { session, carregando } = useSessao();
  const [esperou, setEsperou] = useState(false);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // O link do e-mail traz o token na URL; o cliente cria a sessão logo após carregar.
  useEffect(() => {
    const t = setTimeout(() => setEsperou(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (carregando || (!session && !esperou)) return <Carregando texto="Validando o link…" />;

  if (!session)
    return (
      <AuthShell title="Link inválido ou expirado" sub="Peça um novo link para criar a senha.">
        <div className="ax-links">
          <Link to="/recuperar-senha">Pedir novo link</Link>
          <Link to="/login">Voltar ao login</Link>
        </div>
      </AuthShell>
    );

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < SENHA_MIN)
      return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (senha !== senha2) return setErro("As senhas não são iguais.");
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro(traduzErro(error));
    setOk(true);
  }

  return (
    <AuthShell title="Criar nova senha" sub={session.user.email}>
      {ok ? (
        <>
          <Msg kind="ok">Senha atualizada!</Msg>
          <div className="ax-links">
            <a href="/">🎮 Ir para o jogo</a>
          </div>
        </>
      ) : (
        <form className="ax-form" onSubmit={salvar} noValidate>
          <label className="ax-field">
            Nova senha
            <input
              className="ax-input"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          <label className="ax-field">
            Repita a nova senha
            <input
              className="ax-input"
              type="password"
              autoComplete="new-password"
              value={senha2}
              onChange={(e) => setSenha2(e.target.value)}
              required
            />
          </label>
          <Msg kind="err">{erro}</Msg>
          <button className="ax-btn" type="submit" disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar senha"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
