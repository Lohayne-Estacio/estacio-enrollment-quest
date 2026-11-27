import type { AppRole, Convite } from "./database.types";

export const PAPEL_ROTULO: Record<AppRole, string> = {
  consultor: "Consultor",
  gestor: "Gestor",
  admin: "Admin",
};

/** O que cada perfil de acesso libera, para o admin escolher com clareza. */
export const PAPEL_DESCRICAO: Record<AppRole, string> = {
  consultor: "Usa o simulador e vê o ranking do núcleo.",
  gestor: "Também vê a equipe dos núcleos que acompanha.",
  admin: "Acesso total, inclusive a esta tela de Admin.",
};

export const VALIDADES_DIAS = [1, 7, 30] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lê o id do convite da URL do cadastro; qualquer coisa fora do formato é ignorada. */
export function lerConvite(valor: unknown): string | undefined {
  return typeof valor === "string" && UUID.test(valor.trim())
    ? valor.trim().toLowerCase()
    : undefined;
}

export const linkConvite = (origem: string, id: string) =>
  `${origem}/cadastro?convite=${encodeURIComponent(id)}`;

export type SituacaoConvite = "pendente" | "usado" | "expirado" | "revogado";

export function situacaoConvite(
  c: Pick<Convite, "revogado" | "usado_em" | "expira_em">,
  agora: Date = new Date(),
): SituacaoConvite {
  if (c.usado_em) return "usado";
  if (c.revogado) return "revogado";
  if (new Date(c.expira_em).getTime() <= agora.getTime()) return "expirado";
  return "pendente";
}

export function expiraEm(dias: number, agora: Date = new Date()): string {
  return new Date(agora.getTime() + dias * 86_400_000).toISOString();
}
