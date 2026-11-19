import type { ReactNode } from "react";

export function AuthShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="ax ax-auth">
      <div className="ax-card">
        <div className="ax-brand">
          <span aria-hidden>🦫</span>
          <div>
            <small>MODO GAME · REGIONAL CENTRO SUL</small>
            <b>Simulador do Consultor</b>
          </div>
        </div>
        <h1>{title}</h1>
        {sub ? <p className="ax-sub">{sub}</p> : null}
        {children}
        <p className="ax-legal">
          Simulador não oficial. Os valores são estimativas; vale a política de RV vigente.
        </p>
      </div>
    </main>
  );
}

export function Msg({ kind, children }: { kind: "err" | "ok" | "info"; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className={`ax-msg ${kind}`} role={kind === "err" ? "alert" : "status"}>
      {children}
    </div>
  );
}

/** Tela de espera enquanto a sessão é lida. */
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <main className="ax ax-auth">
      <div className="ax-card" style={{ textAlign: "center" }} role="status">
        <div style={{ fontSize: 34 }} aria-hidden>
          🦫
        </div>
        <p className="ax-sub" style={{ margin: "8px 0 0" }}>
          {texto}
        </p>
      </div>
    </main>
  );
}
