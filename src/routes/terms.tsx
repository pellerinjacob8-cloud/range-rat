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
        <p className="mt-2 text-[13px] text-muted-foreground">Effective June 21, 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-foreground">
          <Section title="1. Acceptance of terms">
            By creating an account or using Range Rat (the "Service"), you agree to be bound by
            these Terms of Service ("Terms"). If you do not agree, do not use the Service. We may
            update these Terms from time to time. Continued use after changes are posted constitutes
            acceptance of the revised Terms.
          </Section>

          <Section title="2. Eligibility">
            You must be at least 13 years old to use the Service. If you are under the age of
            majority in your jurisdiction, you must have the consent of a parent or legal guardian
            to use the Service. By creating an account, you represent and warrant that you meet
            these eligibility requirements.
          </Section>

          <Section title="3. The Service">
            Range Rat is a golf practice application that helps you plan practice sessions, track
            on-course stats, manage your bag, and monitor your progress. Some features require a
            paid subscription (Range Rat Pro).
          </Section>

          <Section title="4. Accounts">
            You must provide accurate information when creating an account. You are responsible for
            maintaining the confidentiality of your login credentials and for all activity that
            occurs under your account. Notify us immediately if you suspect unauthorized access.
            We reserve the right to suspend or terminate accounts that violate these Terms.
            <br /><br />
            You may request deletion of your account at any time by contacting us. Upon deletion,
            certain information may be retained where required by law, accounting obligations, fraud
            prevention, dispute resolution, security purposes, or legitimate business needs. All
            data handling remains subject to our{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </Section>

          <Section title="5. Subscriptions and billing">
            <BulletList items={[
              "Range Rat Pro is available as a monthly or yearly subscription, billed through Stripe.",
              "Prices are displayed in the app before purchase. All amounts are in U.S. dollars unless stated otherwise.",
              "Subscriptions renew automatically at the end of each billing period until you cancel.",
              "We reserve the right to change pricing. Any price change will take effect at your next renewal, and we will notify you in advance.",
              "Range Rat may modify, add, remove, replace, or discontinue features or subscription benefits at any time as the product evolves. We will provide reasonable notice for material changes when practicable.",
            ]} />
          </Section>

          <Section title="6. Cancellation and refunds">
            You may cancel your subscription at any time through the Manage Subscription option on
            your profile, which opens the Stripe customer portal. Cancellation stops future
            renewals; you retain access to Pro features until the end of your current paid period.
            Because you can cancel at any time and continue using the service through the end of
            your billing cycle, refunds are generally not provided. If you believe you were charged
            in error, contact us and we will review your case.
          </Section>

          <Section title="7. Free and Pro features">
            Certain features are available to all users at no cost. Pro features are clearly marked
            in the app. We may change which features are included in the free or Pro tiers at our
            discretion. Subscription benefits may evolve as the product develops. We will not remove
            a core paid feature mid-billing-cycle without reasonable notice.
          </Section>

          <Section title="8. Your data and content">
            You retain ownership of the golf data and content you enter into the Service (sessions,
            rounds, bag configuration, scores, and similar information). You represent and warrant
            that you have the rights necessary to submit such content and that it does not violate
            any applicable law or third-party rights.
            <br /><br />
            By using the Service, you grant us a limited license to store, process, and display
            your data solely to provide and improve the Service. We will not use your individual
            data for purposes unrelated to operating the Service. You are solely responsible for
            the accuracy and legality of the content you submit.
            <br /><br />
            We reserve the right to remove content that violates these Terms, applicable law, or
            the integrity of the platform. See our{" "}
            <a href="/privacy" className="underline">Privacy Policy</a> for details on how we
            handle your information.
          </Section>

          <Section title="9. Acceptable use">
            You agree not to:
            <BulletList items={[
              "Use the Service for any unlawful purpose.",
              "Attempt to gain unauthorized access to other users' accounts or data.",
              "Interfere with or disrupt the Service's infrastructure.",
              "Reverse engineer, decompile, or attempt to extract source code from the application.",
              "Use automated scripts to scrape or interact with the Service without permission.",
            ]} />
          </Section>

          <Section title="10. Intellectual property">
            All rights, title, and interest in and to the Service are owned by Range Rat, including
            but not limited to: software, source code, user interface designs, branding, logos,
            algorithms, practice plan methodologies, Combine scoring systems, training frameworks,
            statistical models, databases, content, and all other proprietary technology.
            <br /><br />
            You may not copy, reproduce, modify, distribute, resell, license, or create derivative
            works based on any part of the Service without our prior written consent. These Terms
            do not grant you any right to use our trademarks, logos, or branding.
          </Section>

          <Section title="11. Feedback">
            If you voluntarily provide ideas, feature requests, suggestions, comments,
            recommendations, or other feedback about the Service ("Feedback"), you grant Range Rat
            a perpetual, irrevocable, worldwide, royalty-free license to use, modify, commercialize,
            reproduce, distribute, and incorporate that Feedback into the Service or any other
            product without restriction. No compensation, royalties, attribution, or approval are
            required.
          </Section>

          <Section title="12. Service availability">
            The Service may experience interruptions, delays, maintenance periods, outages,
            upgrades, or technical issues. We do not guarantee uninterrupted or error-free
            operation. Features may be modified, suspended, replaced, or discontinued at any time.
            We will make reasonable efforts to provide advance notice of planned downtime when
            practicable.
          </Section>

          <Section title="13. Disclaimer of warranties">
            The Service is provided "as is" and "as available" without warranties of any kind,
            whether express or implied, including but not limited to implied warranties of
            merchantability, fitness for a particular purpose, and non-infringement.
            <br /><br />
            All information, recommendations, analytics, practice plans, training suggestions,
            handicap guidance, and performance insights provided through the Service are for
            informational and educational purposes only. They do not constitute professional
            coaching, instruction, or guaranteed performance advice. Individual golf results vary
            and are not guaranteed.
          </Section>

          <Section title="14. Limitation of liability">
            To the fullest extent permitted by law, Range Rat and its owners, officers, employees,
            affiliates, contractors, and agents shall not be liable for any indirect, incidental,
            consequential, special, exemplary, punitive, or lost-profit damages arising out of or
            related to your use of the Service, regardless of the legal theory (contract, tort,
            strict liability, or otherwise) and even if we have been advised of the possibility of
            such damages.
            <br /><br />
            Our total aggregate liability for any claim related to the Service is limited to the
            greater of (a) the total amount you paid to Range Rat during the 12 months immediately
            preceding the event giving rise to the claim, or (b) one hundred U.S. dollars ($100).
          </Section>

          <Section title="15. Termination">
            We may suspend, restrict, or terminate your access to the Service at any time for
            violations of these Terms, suspected abuse, fraudulent activity, security concerns,
            legal compliance obligations, or to protect the integrity of the Service. We may also
            remove content or restrict access while an investigation is ongoing.
            <br /><br />
            Upon termination, your right to use the Service ends immediately. Sections that by
            their nature should survive (including limitation of liability, disclaimers, intellectual
            property, dispute resolution, and indemnification) will survive termination.
          </Section>

          <Section title="16. Governing law and venue">
            These Terms are governed by and construed in accordance with the laws of the State of
            New Hampshire, without regard to its conflict-of-law principles. Any dispute arising
            from or relating to the Service or these Terms shall be brought exclusively in the
            state or federal courts located in New Hampshire. You consent to the personal
            jurisdiction and venue of those courts.
          </Section>

          <Section title="17. Dispute resolution and arbitration">
            Before initiating any formal proceeding, you agree to first contact us and attempt to
            resolve the dispute informally through good-faith negotiation for at least thirty (30)
            days.
            <br /><br />
            If the dispute is not resolved informally, you agree that it will be resolved through
            final and binding arbitration administered by the American Arbitration Association (AAA)
            under its Consumer Arbitration Rules. Arbitration may be conducted remotely where
            permitted by the AAA's rules.
            <br /><br />
            <strong>Jury trial waiver.</strong> You and Range Rat each waive the right to a trial
            by jury.
            <br /><br />
            <strong>Class action waiver.</strong> You and Range Rat each agree that disputes will be
            resolved on an individual basis only. You waive the right to participate in any class
            action, class arbitration, or other representative proceeding, whether as a plaintiff
            or class member.
            <br /><br />
            This arbitration agreement will survive termination of your account and these Terms.
          </Section>

          <Section title="18. Force majeure">
            Range Rat shall not be liable for any delay, interruption, failure, or inability to
            perform its obligations under these Terms caused by events beyond our reasonable
            control, including but not limited to natural disasters, acts of government, labor
            disputes, internet or telecommunications outages, cloud provider failures, payment
            processor failures, cyberattacks, utility failures, epidemics, pandemics, or similar
            events.
          </Section>

          <Section title="19. Assignment">
            You may not assign or transfer your rights or obligations under these Terms without our
            prior written consent. Range Rat may assign or transfer its rights and obligations
            without restriction, including in connection with a merger, acquisition, financing
            transaction, reorganization, or sale of assets.
          </Section>

          <Section title="20. Severability">
            If any provision of these Terms is found to be invalid, illegal, or unenforceable by a
            court of competent jurisdiction, the remaining provisions will continue in full force
            and effect.
          </Section>

          <Section title="21. Entire agreement">
            These Terms, together with the{" "}
            <a href="/privacy" className="underline">Privacy Policy</a> and any other policies
            incorporated by reference, constitute the entire agreement between you and Range Rat
            regarding your use of the Service. They supersede all prior agreements, understandings,
            and communications, whether written or oral, relating to the Service.
          </Section>

          <Section title="22. Contact us">
            If you have questions about these Terms, email us at{" "}
            <a href="mailto:support@range-rat.app" className="underline">support@range-rat.app</a>.
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
