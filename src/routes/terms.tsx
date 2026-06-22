import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Range Rat: Terms of Service" },
      { name: "description", content: "The terms that govern your use of Range Rat." },
    ],
  }),
  component: TermsPage,
});

// NOTE: This is a starting scaffold. Replace the section bodies below with the
// final Terms of Service text from your generator (e.g. Termly) before launch.
function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 pb-16 pt-[env(safe-area-inset-top)]">
      <div className="max-w-2xl mx-auto">
        <div className="pt-6 flex items-center">
          <button onClick={() => navigate({ to: "/" })} className="text-muted-foreground -ml-1 p-1">
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>

        <h1 className="mt-4 font-display text-[34px] leading-tight tracking-[-0.01em]">Terms of Service</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">Last updated June 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-foreground">
          <Section title="Acceptance of terms">
            By creating an account or using Range Rat, you agree to these terms. If you do not
            agree, do not use the app.
          </Section>
          <Section title="Subscriptions and billing">
            Range Rat Pro is a paid subscription billed monthly or yearly through Stripe. Plans
            renew automatically until cancelled. Prices are shown in the app before you purchase.
          </Section>
          <Section title="Cancellation">
            You can cancel anytime from your profile, which opens the Stripe customer portal.
            Cancellation stops future renewals. Access continues until the end of the paid period.
          </Section>
          <Section title="Acceptable use">
            Use the app for its intended purpose. Do not attempt to disrupt the service, access
            other users' data, or reverse engineer the app.
          </Section>
          <Section title="Disclaimer">
            Range Rat is provided as is, without warranties. We are not liable for any indirect or
            incidental damages arising from your use of the app.
          </Section>
          <Section title="Contact">
            Questions about these terms? Email us at support@range-rat.app.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[20px] mb-1.5">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
