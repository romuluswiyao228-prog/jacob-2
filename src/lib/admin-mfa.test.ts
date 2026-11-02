import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

import { fetchAdminRequiresMfa } from "@/lib/admin-mfa";

describe("fetchAdminRequiresMfa", () => {
  beforeEach(() => rpc.mockReset());

  it("renvoie false quand la base n'exige pas la MFA", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await fetchAdminRequiresMfa()).toBe(false);
  });
  it("renvoie true quand la base exige la MFA", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await fetchAdminRequiresMfa()).toBe(true);
  });
  it("considère la MFA exigée en cas d'erreur (prudence)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "réseau" } });
    expect(await fetchAdminRequiresMfa()).toBe(true);
  });
});
