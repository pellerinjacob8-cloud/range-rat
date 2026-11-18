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
        <p className="mt-2 text-[13px] text-muted-foreground">Effective November 18, 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-foreground">
          <Section title="Introduction">
            Range Rat ("we," "us," or "our") operates the Range Rat golf practice application
            available at rangeratapp.com (the "Service"). This Privacy Policy explains what
            information we collect, how we use and protect it, and the choices available to you.
            By using the Service you agree to the collection and use of information as described here.
          </Section>

          <Section title="Information we collect">
            <BulletList items={[
              <><strong>Account information.</strong> When you sign up we collect your email address, name, and which hand you play, to create and secure your account.</>,
              <><strong>Golf data.</strong> What you enter or do in the app: your handicap index and its history, round stats (greens in regulation, fairways, putts, up and downs), the clubs in your bag (with optional brand and model), swing yardages, finished practice sessions (balls hit, blocks completed, areas practiced, putting results), saved sessions, and Combine results.</>,
              <><strong>Subscription data.</strong> If you subscribe to Range Rat Pro, Stripe collects your payment method and billing details. We only store whether your Pro subscription is active. We never see or store your card number.</>,
              <><strong>Feature usage.</strong> When you are signed in, we record which screens and features you use: for example opening a screen, starting or finishing a practice session or game (including its score), saving your bag or yardages, and viewing or tapping upgrade options. These records are linked to your account ID and never include your name, email, or anything you type.</>,
              <><strong>Device and technical data.</strong> Our hosting and error monitoring providers receive basic technical information when you use the Service, such as browser type, device type, IP address, and the page where an error happened. We do not use advertising trackers.</>,
            ]} />
          </Section>

          <Section title="How we use your information">
            <BulletList items={[
              "To create, authenticate, and maintain your account.",
              "To provide and personalize app features such as practice sessions built from your bag, sessions matched to your handicap, and recommendations from your round stats.",
              "To understand which features are used so we can improve the app.",
              "To find and fix errors.",
              "To process and manage your Range Rat Pro subscription.",
              "To communicate with you about your account, subscription, or changes to this policy.",
              "To monitor and protect the security and integrity of the Service.",
            ]} />
          </Section>

          <Section title="Service providers">
            We share information only with the service providers necessary to operate the app:
            <BulletList items={[
              <><strong>Supabase</strong> provides authentication and database hosting. Your account and golf data are stored in Supabase's infrastructure.</>,
              <><strong>Stripe</strong> processes subscription payments. Stripe's handling of your payment information is governed by the <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Stripe Privacy Policy</a>.</>,
              <><strong>Vercel</strong> hosts the application and serves web pages.</>,
              <><strong>Resend</strong> delivers account emails (sign-up codes, confirmations, password resets) and notifies us when a new account is created, including the new user's name and email.</>,
              <><strong>Sentry</strong> receives error reports when something in the app breaks, so we can fix it.</>,
            ]} />
            We do not sell, rent, or share your personal information with advertisers or unrelated third parties.
          </Section>

          <Section title="Cookies and local storage">
            The Service uses your browser's local storage to keep you signed in, remember settings
            such as your theme and practice choices, and save a session that is in progress. Feature
            usage records are stored on our servers, not in cookies. We do not use cookies for
            advertising or cross-site tracking. You can clear local storage through your browser
            settings, but doing so will sign you out.
          </Section>

          <Section title="Data retention">
            We retain your account and golf data for as long as your account is active. When you
            delete your account from your profile, your account and golf data are removed right away.
            Feature usage records are kept only with the link to your account removed, so they can no
            longer be connected to you. Stripe keeps billing records as required by law. Some data may
            persist in encrypted backups for a limited time before being purged in the normal backup
            rotation cycle.
          </Section>

          <Section title="Your rights and choices">
            You may:
            <BulletList items={[
              "Access and export your data by contacting us.",
              "Correct inaccurate information in your profile at any time.",
              "Delete your account and your golf data instantly from your profile via Delete account, or by emailing us at the address below.",
              "Cancel your Pro subscription at any time through the Manage subscription option on your profile, which opens the Stripe customer portal. Deleting your account also cancels any active subscription immediately.",
            ]} />
            If you are located in the European Economic Area (EEA), United Kingdom, or California,
            you may have additional rights under GDPR or CCPA. Contact us and we will accommodate
            your request in accordance with applicable law.
          </Section>

          <Section title="Security">
            We use industry-standard measures to protect your data, including encrypted connections
            (TLS), row-level security policies in our database, and server-side verification of
            authentication tokens. No system is perfectly secure, and we cannot guarantee absolute
            security, but we take reasonable steps to protect the information you entrust to us.
          </Section>

          <Section title="Children's privacy">
            The Service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal
            data, please contact us and we will delete it promptly.
          </Section>

          <Section title="Changes to this policy">
            We may update this Privacy Policy from time to time. If we make material changes, we
            will notify you by updating the "Effective" date at the top of this page and, where
            appropriate, by email. Your continued use of the Service after changes take effect
            constitutes acceptance of the revised policy.
          </Section>

          <Section title="Contact us">
            If you have questions about this Privacy Policy or want to exercise your data rights,
            email us at{" "}
            <a href="mailto:support@rangeratapp.com" className="underline">support@rangeratapp.com</a>.
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
      <div className="text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 mt-2">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}
