import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isPro: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  const fetchProStatus = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", userId)
      .single();
    setIsPro(data?.is_pro ?? false);
  };

  const refreshProStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await fetchProStatus(user.id);
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) fetchProStatus(data.session.user.id);

      // Refresh session to ensure token is valid (handles expired tokens)
      if (data.session) {
        const { data: refreshData } = await supabase.auth.refreshSession(data.session);
        if (refreshData.session) {
          setSession(refreshData.session);
        }
      }

      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProStatus(session.user.id);
        import("@/lib/db").then(({ migrateFromLocalStorage }) => migrateFromLocalStorage());
      } else {
        setIsPro(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("[signIn]", { user: data?.user?.email, error: error?.message });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      isPro,
      signUp,
      signIn,
      signOut,
      resendVerification,
      resetPassword,
      refreshProStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
