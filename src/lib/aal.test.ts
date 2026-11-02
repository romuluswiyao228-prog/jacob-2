import { describe, it, expect } from "vitest";
import { aalFromToken } from "@/lib/aal";

function makeToken(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

describe("aalFromToken", () => {
  it("lit aal2 dans le jeton", () => {
    expect(aalFromToken(makeToken({ sub: "x", aal: "aal2" }))).toBe("aal2");
  });
  it("lit aal1 dans le jeton", () => {
    expect(aalFromToken(makeToken({ sub: "x", aal: "aal1" }))).toBe("aal1");
  });
  it("renvoie null sans jeton, jeton cassé ou sans aal", () => {
    expect(aalFromToken(undefined)).toBeNull();
    expect(aalFromToken("pas-un-jeton")).toBeNull();
    expect(aalFromToken(makeToken({ sub: "x" }))).toBeNull();
  });
});
