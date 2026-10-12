import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";

type AuthState = ReturnType<typeof useAuth>;

const mockUser = { id: "test-id", email: "test@example.com" } as User;

function makeAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: null,
    session: null,
    isLoading: false,
    role: null,
    isAdmin: false,
    aalLevel: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    refreshRole: vi.fn(),
    ...overrides,
  };
}

let roots: Root[] = [];

async function renderInRouter(element: ReactElement): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(() => {
    root.render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/protected" element={element} />
          <Route path="/connexion" element={<div data-testid="login-page" />} />
          <Route path="/admin/connexion" element={<div data-testid="admin-login" />} />
          <Route path="/admin/mfa-setup" element={<div data-testid="mfa-setup" />} />
        </Routes>
      </MemoryRouter>
    );
  });
  return container;
}

beforeEach(() => {
  vi.mocked(useAuth).mockReset();
});

afterEach(() => {
  roots.forEach((r) => r.unmount());
  roots = [];
  document.body.innerHTML = "";
});

describe("RequireAuth", () => {
  it("redirige vers /connexion si non connecté", async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthState({ isLoading: false, user: null }));
    const container = await renderInRouter(
      <RequireAuth>
        <div data-testid="child" />
      </RequireAuth>
    );
    expect(container.querySelector('[data-testid="login-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="child"]')).toBeNull();
  });
});

describe("RequireAdmin", () => {
  it("refuse l'accès si l'utilisateur n'est pas propriétaire", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthState({ isLoading: false, user: mockUser, isAdmin: false, aalLevel: "aal1" })
    );
    const container = await renderInRouter(
      <RequireAdmin>
        <div data-testid="admin-child" />
      </RequireAdmin>
    );
    expect(container.querySelector('[data-testid="admin-login"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="admin-child"]')).toBeNull();
  });

  it("refuse l'accès si la MFA n'est pas activée (aal1)", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthState({ isLoading: false, user: mockUser, isAdmin: true, aalLevel: "aal1" })
    );
    const container = await renderInRouter(
      <RequireAdmin>
        <div data-testid="admin-child" />
      </RequireAdmin>
    );
    expect(container.querySelector('[data-testid="mfa-setup"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="admin-child"]')).toBeNull();
  });
});
