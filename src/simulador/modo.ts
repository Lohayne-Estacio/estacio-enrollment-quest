/* Modo do simulador na URL: / (registro) ou /?modo=sim&sim=<id> (simulação). */
export type Modo = "registro" | "sim";

/** Lê o modo da URL: /?modo=sim&sim=<id>. */
export function lerModo(search: string): { modo: Modo; simId: string | null } {
  const q = new URLSearchParams(search);
  const modo: Modo = q.get("modo") === "sim" ? "sim" : "registro";
  return { modo, simId: modo === "sim" ? q.get("sim") || null : null };
}

export const urlModo = (modo: Modo, simId?: string | null) =>
  modo === "registro" ? "/" : simId ? `/?modo=sim&sim=${encodeURIComponent(simId)}` : "/?modo=sim";
