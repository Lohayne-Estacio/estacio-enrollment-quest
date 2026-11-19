import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { sair, temPapel, usePapeis, useSessao } from "@/lib/auth";
import type { AppRole } from "@/lib/database.types";

import { AuthShell, Carregando } from "./AuthShell";

/** Só renderiza `children` para quem tem um dos papéis. Sem sessão → /login. */
export function Restrito({
  papeis: exigidos,
  children,
}: {
  papeis: AppRole[];
  children: (ctx: { session: Session; papeis: AppRole[] }) => ReactNode;
}) {
  const nav = useNavigate();
  const { session, carregando } = useSessao();
  const papeis = usePapeis(session?.user.id);

  useEffect(() => {
    if (!carregando && !session) void nav({ to: "/login", replace: true });
  }, [carregando, session, nav]);

  if (!session || papeis === null) return <Carregando />;
  if (!temPapel(papeis, ...exigidos))
    return (
      <AuthShell title="Sem acesso" sub="Esta área é só para gestores e admins.">
        <div className="ax-links">
          <a href="/">🎮 Voltar ao jogo</a>
          <button className="ax-btn ghost sm" type="button" onClick={() => void sair()}>
            Sair
          </button>
        </div>
      </AuthShell>
    );
  return <>{children({ session, papeis })}</>;
}

export function TopoPainel({
  email,
  admin,
  equipe = true,
}: {
  email?: string | undefined;
  admin: boolean;
  /** Mostra o link da equipe (gestor/admin). */
  equipe?: boolean;
}) {
  return (
    <nav className="ax-bar" aria-label="Conta">
      <span className="who">{email}</span>
      <a href="/">🎮 Simulador</a>
      <a href="/ranking">🏆 Ranking</a>
      {equipe ? <a href="/equipe">📊 Equipe</a> : null}
      {admin ? <a href="/admin">🛠️ Admin</a> : null}
      <button type="button" onClick={() => void sair()}>
        Sair
      </button>
    </nav>
  );
}
