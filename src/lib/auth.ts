import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import type { AppRole } from "./database.types";
import { supabase } from "./supabase";
import { ALLOWED_EMAIL_DOMAINS } from "./supabase-config";

export const emailPermitido = (email: string) =>
  ALLOWED_EMAIL_DOMAINS.includes(email.trim().toLowerCase().split("@")[1] ?? "");

export const MSG_DOMINIO = "Use seu e-mail corporativo @estacio.br ou @yduqs.com.br.";

/** Traduz os erros mais comuns do Supabase Auth para mensagens em português. */
export function traduzErro(
  err: { message?: string | undefined; code?: string | undefined } | null | undefined,
): string {
  if (!err) return "";
  const m = (err.message || "").toLowerCase();
  const c = err.code || "";
  if (c === "invalid_credentials" || m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (c === "email_not_confirmed" || m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada (e no spam).";
  if (c === "user_already_exists" || m.includes("already registered"))
    return "Já existe uma conta com esse e-mail. Faça login ou recupere a senha.";
  if (c === "weak_password" || m.includes("password should"))
    return "Senha fraca: use pelo menos 8 caracteres, com letras e números.";
  if (c === "same_password" || m.includes("different from the old"))
    return "A nova senha precisa ser diferente da atual.";
  if (
    c === "over_email_send_rate_limit" ||
    c === "over_request_rate_limit" ||
    m.includes("rate limit")
  )
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  if (m.includes("estacio.br") || m.includes("database error saving new user")) return MSG_DOMINIO;
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  if (c === "otp_expired" || m.includes("expired")) return "O link expirou. Peça um novo.";
  return "Não foi possível concluir agora. Tente de novo em instantes.";
}

/** Sessão atual do navegador. `carregando` fica true até a primeira leitura. */
export function useSessao() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let vivo = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setCarregando(false);
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return { session, carregando };
}

export async function meusPapeis(): Promise<AppRole[]> {
  const { data, error } = await supabase.rpc("meus_papeis");
  if (error || !data) return [];
  return data as AppRole[];
}

export function usePapeis(userId: string | undefined) {
  const [papeis, setPapeis] = useState<AppRole[] | null>(null);
  useEffect(() => {
    if (!userId) {
      setPapeis(null);
      return;
    }
    let vivo = true;
    void meusPapeis().then((p) => vivo && setPapeis(p));
    return () => {
      vivo = false;
    };
  }, [userId]);
  return papeis;
}

export const temPapel = (papeis: AppRole[] | null, ...quais: AppRole[]) =>
  !!papeis?.some((p) => quais.includes(p));

export async function sair() {
  try {
    await supabase.auth.signOut();
  } finally {
    window.location.assign("/login");
  }
}

export const SENHA_MIN = 8;

export const origem = () => (typeof window !== "undefined" ? window.location.origin : "");
