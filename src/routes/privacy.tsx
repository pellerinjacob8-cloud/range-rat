import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Range Rat: Privacy Policy" },
      { name: "description", content: "How Range Rat collects, uses, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

// NOTE: This is a starting scaffold. Replace the section bodies below with the
// final Privacy Policy text from your generator (e.g. Termly) before launch.
function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 pb-16 pt-[env(safe-area-inset-top)]">
      <div className="max-w-2xl mx-auto">
        <div className="pt-6 flex items-center">
          <button onClick={() => navigate({ to: "/" })} className="text-muted-foreground -ml-1 p-1">
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>

        <h1 className="mt-4 font-display text-[34px] leading-tight tracking-[-0.01em]">Privacy Policy</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">Last updated June 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-foreground">
          <Section title="Overview">
            Range Rat ("we", "us") provides a golf practice app. This policy explains what we
            collect, how we use it, and the choices you have.
          </Section>
          <Section title="Information we collect">
            Account details you provide such as your name and email address, the practice and
            on-course data you log (sessions, bag, yardages, rounds, and handicap), and basic
            technical data needed to run the service.
          </Section>
          <Section title="How we use your information">
            To create and secure your account, to provide and improve the app's features, to
            process subscriptions, and to communicate with you about your account.
          </Section>
          <Section title="Service providers">
            We use Supabase for authentication and data storage and Stripe for payment
            processing. Payment card details are handled by Stripe and never stored by us.
          </Section>
          <Section title="Data retention and your rights">
            We keep your data while your account is active. You may request access to, correction
            of, or deletion of your data at any time by contacting us.
          </Section>
          <Section title="Contact">
            Questions about this policy? Email us at support@range-rat.app.
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
