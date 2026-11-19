import { describe, expect, it } from "vitest";

import { lerModo, urlModo } from "./modo";

describe("modo na URL", () => {
  it("registro é o padrão", () => {
    expect(lerModo("")).toEqual({ modo: "registro", simId: null });
    expect(lerModo("?modo=xyz&sim=1")).toEqual({ modo: "registro", simId: null });
  });
  it("simulação nova ou salva", () => {
    expect(lerModo("?modo=sim")).toEqual({ modo: "sim", simId: null });
    expect(lerModo("?modo=sim&sim=abc")).toEqual({ modo: "sim", simId: "abc" });
  });
  it("ida e volta", () => {
    expect(urlModo("registro", "abc")).toBe("/");
    expect(urlModo("sim")).toBe("/?modo=sim");
    expect(lerModo(urlModo("sim", "a b").slice(1))).toEqual({ modo: "sim", simId: "a b" });
  });
});
