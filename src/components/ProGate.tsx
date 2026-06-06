import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { ProModal } from "@/components/ProModal";

interface ProGateProps {
  feature: string;
  children: React.ReactNode;
}

export function ProGate({ feature, children }: ProGateProps) {
  const { isPro, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  if (loading) return null;

  if (!isPro) {
    return (
      <ProModal
        open={open}
        onClose={() => { setOpen(false); navigate({ to: "/" }); }}
        reason={`${feature} is a Pro feature. Upgrade to unlock it and the full Range Rat experience.`}
      />
    );
  }

  return <>{children}</>;
}
