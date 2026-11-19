import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import axCss from "@/app/app.css?url";
import { AuthShell, Msg } from "@/components/app/AuthShell";
import { emailPermitido, MSG_DOMINIO, origem, SENHA_MIN, traduzErro } from "@/lib/auth";
import { listarNucleos, NUCLEOS_RESERVA } from "@/lib/nucleos";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [{ title: "Criar conta · Simulador do Consultor" }],
    links: [{ rel: "stylesheet", href: axCss }],
  }),
  component: Cadastro,
});

function Cadastro() {
  const [nucleos, setNucleos] = useState<string[]>(NUCLEOS_RESERVA);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [nucleo, setNucleo] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void listarNucleos().then(setNucleos);
  }, []);

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const em = email.trim().toLowerCase();
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (!emailPermitido(em)) return setErro(MSG_DOMINIO);
    if (senha.length < SENHA_MIN)
      return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (senha !== senha2) return setErro("As senhas não são iguais.");
    if (!nucleo) return setErro("Escolha o seu núcleo.");
    setEnviando(true);
    const { error } = await supabase.auth.signUp({
      email: em,
      password: senha,
      options: { data: { nome: nome.trim(), nucleo }, emailRedirectTo: `${origem()}/login` },
    });
    setEnviando(false);
    if (error) return setErro(traduzErro(error));
    setEnviado(em);
  }

  if (enviado)
    return (
      <AuthShell title="Confirme seu e-mail" sub="Falta só um passo para começar a jogar.">
        <Msg kind="ok">
          Enviamos um link de confirmação para <b>{enviado}</b>. Abra o e-mail e toque no link para
          ativar a conta.
        </Msg>
        <p className="ax-hint" style={{ marginTop: 12 }}>
          Não chegou em alguns minutos? Confira o spam ou a quarentena do e-mail corporativo. Se
          você já tinha conta, use “Esqueci a senha” no login.
        </p>
        <div className="ax-links">
          <Link to="/login">Ir para o login</Link>
        </div>
      </AuthShell>
    );

  return (
    <AuthShell title="Criar conta" sub="Só para e-mails @estacio.br e @yduqs.com.br.">
      <form className="ax-form" onSubmit={cadastrar} noValidate>
        <label className="ax-field">
          Nome
          <input
            className="ax-input"
            autoComplete="name"
            maxLength={40}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>
        <label className="ax-field">
          E-mail corporativo
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
            autoComplete="new-password"
            minLength={SENHA_MIN}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        <label className="ax-field">
          Repita a senha
          <input
            className="ax-input"
            type="password"
            autoComplete="new-password"
            value={senha2}
            onChange={(e) => setSenha2(e.target.value)}
            required
          />
        </label>
        <label className="ax-field">
          Núcleo
          <select
            className="ax-select"
            value={nucleo}
            onChange={(e) => setNucleo(e.target.value)}
            required
          >
            <option value="">Escolha seu núcleo</option>
            {nucleos.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="ax-hint">Depois de definido, só um admin pode trocar o núcleo.</span>
        </label>
        <Msg kind="err">{erro}</Msg>
        <button className="ax-btn" type="submit" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta"}
        </button>
        <p className="ax-hint">
          Você vai receber um e-mail para confirmar a conta antes do primeiro login.
        </p>
      </form>
      <div className="ax-links">
        <Link to="/login">Já tenho conta</Link>
      </div>
    </AuthShell>
  );
}
