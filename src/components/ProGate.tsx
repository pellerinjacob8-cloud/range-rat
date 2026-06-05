import { useNavigate } from "@tanstack/react-router";
import { Lock, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";

interface ProGateProps {
  feature: string;
  children: React.ReactNode;
}

export function ProGate({ feature, children }: ProGateProps) {
  const { isPro, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!isPro) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{feature} is a Pro feature</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Upgrade to Range Rat Pro to unlock {feature} and all other premium features.
            </p>
          </div>
          <Button
            className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold gap-2"
            onClick={() => navigate({ to: "/upgrade" })}
          >
            <Zap className="w-4 h-4" />
            Upgrade to Pro
          </Button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/" })}
          >
            Back to home
          </button>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
