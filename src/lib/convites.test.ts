import { describe, expect, it } from "vitest";

import { expiraEm, lerConvite, linkConvite, situacaoConvite } from "./convites";

const ID = "3f1c2a9e-8b7d-4c6e-9a1f-0b2c3d4e5f60";

describe("lerConvite", () => {
  it("aceita um uuid e normaliza", () => {
    expect(lerConvite(` ${ID.toUpperCase()} `)).toBe(ID);
  });
  it("ignora valores fora do formato", () => {
    expect(lerConvite("abc")).toBeUndefined();
    expect(lerConvite(123)).toBeUndefined();
    expect(lerConvite(undefined)).toBeUndefined();
  });
});

describe("linkConvite", () => {
  it("monta o link do cadastro", () => {
    expect(linkConvite("https://cap-go.vercel.app", ID)).toBe(
      `https://cap-go.vercel.app/cadastro?convite=${ID}`,
    );
  });
});

describe("situacaoConvite", () => {
  const agora = new Date("2026-11-27T12:00:00Z");
  const base = { revogado: false, usado_em: null, expira_em: "2026-11-28T12:00:00Z" };
  it("pendente dentro da validade", () => {
    expect(situacaoConvite(base, agora)).toBe("pendente");
  });
  it("usado vence revogado e expirado", () => {
    expect(
      situacaoConvite(
        { revogado: true, usado_em: "2026-11-27T10:00:00Z", expira_em: "2026-11-01T00:00:00Z" },
        agora,
      ),
    ).toBe("usado");
  });
  it("revogado", () => {
    expect(situacaoConvite({ ...base, revogado: true }, agora)).toBe("revogado");
  });
  it("expirado", () => {
    expect(situacaoConvite({ ...base, expira_em: "2026-11-27T12:00:00Z" }, agora)).toBe("expirado");
  });
});

describe("expiraEm", () => {
  it("soma os dias", () => {
    expect(expiraEm(7, new Date("2026-11-27T12:00:00Z"))).toBe("2026-12-04T12:00:00.000Z");
  });
});
