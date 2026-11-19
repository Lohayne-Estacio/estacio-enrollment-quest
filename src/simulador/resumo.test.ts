import { describe, expect, it } from "vitest";

import { calcResumo } from "./resumo";
import { comm } from "./rules";

describe("calcResumo (simulador_resumo)", () => {
  it("vazio: tudo zero, núcleo nulo, 1 dia útil mínimo", () => {
    const r = calcResumo({}, "2026-11");
    expect(r).toMatchObject({
      mes: "2026-11",
      dias_uteis: 1,
      dias_decorridos: 0,
      meta_grad: 0,
      realizado_grad: 0,
      atingimento_grad_pct: 0,
      faixa_grad: 0,
      atingimento_nucleo_pct: null,
      rv_total: 0,
      faixa_pos: 0,
      rvv_pos_multiplo: 0,
    });
  });

  it("graduação soma modalidades + Med. Vet./Odonto e usa comm() de rules.ts", () => {
    // meta 10 presencial + 5 EAD + 2 Med. Vet. + 3 Odonto = 20; realizado 12 + 4 + 2 + 2 = 20 → 100%
    const c = {
      m0: "10",
      m3: "5",
      m7: "2",
      m8: "3",
      r0: "12",
      r3: "4",
      r7: "2",
      r8: "2",
      nm: "100",
      nr: "112",
    };
    const r = calcResumo(c, "2026-11");
    const k = comm([12, 0, 0, 4, 4], 100, 112);
    expect(r.meta_grad).toBe(20);
    expect(r.realizado_grad).toBe(20);
    expect(r.atingimento_grad_pct).toBe(100);
    expect(r.faixa_grad).toBe(3);
    expect(r.atingimento_nucleo_pct).toBe(112);
    expect(r.rv_base).toBeCloseTo(k.base);
    expect(r.rv_bonus_nucleo).toBeCloseTo(k.bonus);
    expect(r.rv_total).toBeCloseTo(k.tot);
    expect(r.rv_antecipacao).toBeCloseTo(k.mes);
    expect(r.rv_saldo).toBeCloseTo(k.ciclo);
    // 12×80 + 4×35 + 4×200 = 1900; +10% núcleo = 2090
    expect(r.rv_total).toBe(2090);
  });

  it("Med. Vet. Semi (r12) e cursos estrela (r4–r6) não somam em dobro", () => {
    const r = calcResumo({ m0: "10", r0: "3", r4: "3", r12: "5" }, "2026-11");
    expect(r.realizado_grad).toBe(3);
  });

  it("pós: faixa e múltiplo do salário, sem usar o salário", () => {
    const r = calcResumo(
      { m9: "5", m10: "3", m11: "2", r9: "5", r10: "3", r11: "1", sal: "5000" },
      "2026-11",
    );
    expect(r.meta_pos).toBe(10);
    expect(r.realizado_pos).toBe(9);
    expect(r.atingimento_pos_pct).toBe(90);
    expect(r.faixa_pos).toBe(2);
    expect(r.rvv_pos_multiplo).toBe(0.15);
    expect(JSON.stringify(r)).not.toContain("5000");
  });

  it("valores inválidos ou negativos viram 0 e decorridos ≤ úteis (como o engine)", () => {
    const r = calcResumo({ du: "20", dec: "25", m0: "-4", r0: "abc" }, "2026-11");
    expect(r.dias_uteis).toBe(20);
    expect(r.dias_decorridos).toBe(20);
    expect(r.meta_grad).toBe(0);
    expect(r.realizado_grad).toBe(0);
  });
});
