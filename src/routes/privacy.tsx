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
        <p className="mt-2 text-[13px] text-muted-foreground">Effective June 21, 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-foreground">
          <Section title="Introduction">
            Range Rat ("we," "us," or "our") operates the Range Rat golf practice application
            available at rangeratapp.com (the "Service"). This Privacy Policy explains what
            information we collect, how we use and protect it, and the choices available to you.
            By using the Service you agree to the collection and use of information as described here.
          </Section>

          <Section title="Information we collect">
            <BulletList items={[
              <><strong>Account information.</strong> When you sign up we collect your name and email address to create and secure your account.</>,
              <><strong>Golf data.</strong> Practice sessions, on-course rounds, scores, handicap index, club bag configuration (brands, degrees, yardages), and goals you enter while using the app.</>,
              <><strong>Subscription data.</strong> If you subscribe to Range Rat Pro, Stripe collects your payment method and billing details on our behalf. We receive your Stripe customer ID, subscription status, and billing history but never see or store your full card number.</>,
              <><strong>Device and usage data.</strong> We automatically collect basic technical information needed to operate the Service, including browser type, device type, IP address, and pages visited. We do not use third-party advertising trackers.</>,
            ]} />
          </Section>

          <Section title="How we use your information">
            <BulletList items={[
              "To create, authenticate, and maintain your account.",
              "To provide, personalize, and improve app features such as practice recommendations, stat tracking, and handicap-based drill selection.",
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
              <><strong>Resend</strong> delivers transactional emails (account confirmations, password resets).</>,
            ]} />
            We do not sell, rent, or share your personal information with advertisers or unrelated third parties.
          </Section>

          <Section title="Cookies and local storage">
            The Service uses essential cookies and browser local storage to keep you signed in and
            to store in-progress session data. We do not use cookies for advertising or cross-site
            tracking. You can clear local storage through your browser settings, but doing so will
            sign you out.
          </Section>

          <Section title="Data retention">
            We retain your account and golf data for as long as your account is active. If you
            delete your account, we will remove your personal data from our active systems within
            30 days. Some data may persist in encrypted backups for a limited time before being
            purged in the normal backup rotation cycle.
          </Section>

          <Section title="Your rights and choices">
            You may:
            <BulletList items={[
              "Access and export your data by contacting us.",
              "Correct inaccurate information in your profile at any time.",
              "Delete your account and associated data by emailing us at the address below.",
              "Cancel your Pro subscription at any time through the Manage Subscription option on your profile, which opens the Stripe customer portal.",
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
            <a href="mailto:pellerinjacob8@gmail.com" className="underline">pellerinjacob8@gmail.com</a>.
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
