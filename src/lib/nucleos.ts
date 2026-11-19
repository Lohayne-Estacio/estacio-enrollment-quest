import { supabase } from "./supabase";

/** Reserva para a tela de cadastro: visitantes sem login não leem a tabela `nucleos` (RLS só para logados).
 * Mesma ordem e nomes da tabela. Com sessão, a lista sempre vem do banco. */
export const NUCLEOS_RESERVA = [
  "SP Metropolitana",
  "SP Sul-ABC",
  "SP Interior",
  "Espírito Santo",
  "BH - Central",
  "BH - Metropolitano",
  "Juiz de Fora",
  "Curitiba",
  "Londrina",
  "Porto Alegre",
  "Santa Catarina",
];

/** Nomes antigos do HTML original → nomes atuais da tabela. */
export const NUCLEO_RENOMEADO: Record<string, string> = {
  "BH 1": "BH - Central",
  "BH 2": "BH - Metropolitano",
};
export const nucleoAtual = (n: string | null | undefined) =>
  n ? (NUCLEO_RENOMEADO[n] ?? n) : (n ?? null);

export async function listarNucleos(): Promise<string[]> {
  const { data, error } = await supabase.from("nucleos").select("nome, ordem").order("ordem");
  if (error || !data?.length) return NUCLEOS_RESERVA;
  return data.map((n) => n.nome);
}
