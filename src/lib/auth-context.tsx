import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
  aalLevel: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{
    error: string | null;
    needsConfirmation: boolean;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  const aalLevel = (session?.user?.user_metadata as Record<string, unknown> | undefined)?.aal as string | null
    ?? (session?.user as Record<string, unknown> | undefined)?.aal as string | null
    ?? null;
  const isAdmin = role === "owner";

  const fetchRole = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      setRole(null);
      return;
    }
    setRole(data?.role ?? null);
  }, []);

  const refreshRole = useCallback(async () => {
    if (user) {
      await fetchRole(user.id);
    }
  }, [user, fetchRole]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchRole(data.session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          fetchRole(newSession.user.id);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { error: mapAuthError(error.message) };
      }
      return { error: null };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) {
        return { error: mapAuthError(error.message), needsConfirmation: false };
      }
      const needsConfirmation = !data.session;
      return { error: null, needsConfirmation };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return { error: mapAuthError(error.message) };
    }
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        role,
        isAdmin,
        aalLevel,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return ctx;
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (lower.includes("user already registered")) {
    return "Un compte existe déjà avec cet e-mail.";
  }
  if (lower.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 10 caractères.";
  }
  if (lower.includes("rate limit")) {
    return "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
  }
  if (lower.includes("email not confirmed")) {
    return "Veuillez confirmer votre e-mail avant de vous connecter.";
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}
