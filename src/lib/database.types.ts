/* Tipos das tabelas do Supabase do projeto (schema public).
 * Gerados a partir do banco e reduzidos ao que o app usa. Se o esquema mudar, gere de novo. */
export type AppRole = "consultor" | "gestor" | "admin";

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Nucleo = { nome: string; ordem: number };
export type Profile = {
  id: string;
  email: string;
  nome: string;
  nucleo: string | null;
  avatar_emoji: string | null;
  foto_path: string | null;
  onboarding_concluido: boolean;
  created_at: string;
  updated_at: string;
};
export type UserRole = { user_id: string; role: AppRole; created_at: string };
export type GestorNucleo = { gestor_id: string; nucleo: string };
export type SimuladorEstado = {
  user_id: string;
  mes: string;
  dados: Record<string, unknown>;
  updated_at: string;
};
export type SimuladorResumo = {
  user_id: string;
  mes: string;
  dias_uteis: number | null;
  dias_decorridos: number | null;
  meta_grad: number;
  realizado_grad: number;
  atingimento_grad_pct: number;
  faixa_grad: number;
  atingimento_nucleo_pct: number | null;
  rv_base: number;
  rv_bonus_nucleo: number;
  rv_total: number;
  rv_antecipacao: number;
  rv_saldo: number;
  meta_pos: number;
  realizado_pos: number;
  atingimento_pos_pct: number;
  faixa_pos: number;
  rvv_pos_multiplo: number;
  conquistas: string[];
  updated_at: string;
};

/** Linha da função ranking_nucleo: nada financeiro. */
export type LinhaRanking = {
  posicao: number;
  nome: string;
  avatar_emoji: string | null;
  faixa_grad: number;
  atingimento_grad_pct: number;
  conquistas: string[];
  eu: boolean;
  nucleo: string;
};

export type Database = {
  public: {
    Tables: {
      nucleos: Table<Nucleo, "nome" | "ordem">;
      profiles: Table<Profile, "id" | "email">;
      user_roles: Table<UserRole, "user_id" | "role">;
      gestor_nucleos: Table<GestorNucleo, "gestor_id" | "nucleo">;
      simulador_estado: Table<SimuladorEstado, "user_id" | "mes">;
      simulador_resumo: Table<SimuladorResumo, "user_id" | "mes">;
    };
    Views: { [_ in never]: never };
    Functions: {
      meus_papeis: { Args: Record<string, never>; Returns: AppRole[] };
      ranking_nucleo: { Args: { _mes: string; _nucleo?: string }; Returns: LinhaRanking[] };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: { [_ in never]: never };
  };
};
