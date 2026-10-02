import { Link } from "react-router-dom";
import LegalPage, { type LegalSection } from "./legal/LegalPage";

const EFFECTIVE = "October 2, 2026";
const COMPANY = "KB Tech Inc.";
const EMAIL = "support@socialio.io";

const Email = () => (
  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
    {EMAIL}
  </a>
);

const SUMMARY = [
  "We collect what we need to run your account and make your content: your details, your brief and brand files, and your order history.",
  "Card payments are handled by Stripe. We never see or store your full card number.",
  "We don't sell your data, and we don't use advertising trackers or analytics cookies.",
  "Your data is stored with our providers (Supabase, Stripe, our hosting and email services), some of them outside your country.",
  "You can ask to see, correct, export or delete your data at any time by emailing support@socialio.io.",
];

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          Socialio is a service of {COMPANY}, a Pennsylvania corporation based in Bensalem, Pennsylvania, United States ("we", "us"). We're responsible for the
          personal information described here (the "controller" under EU and UK law).
        </p>
        <p>
          This policy covers socialio.io, the client dashboard and our services. It sits alongside our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p><strong>Information you give us</strong></p>
        <ul>
          <li><strong>Account details:</strong> your name, email address and password. Passwords are stored by our authentication provider in hashed form; we can't read them.</li>
          <li><strong>Google sign-in</strong> (if you use it): the name, email address and profile picture Google shares with us. We don't receive your Google password.</li>
          <li><strong>Your business and brief:</strong> onboarding answers, brand kit (colours, tone, rules, social handles), requests, comments, approvals, and files you upload such as logos, product photos and guidelines.</li>
          <li><strong>Orders and billing:</strong> what you bought, amounts, dates, subscription status and Stripe customer and payment references.</li>
          <li><strong>Contact form and newsletter:</strong> your name, email, company and message, or just your email if you join the newsletter.</li>
          <li><strong>Performance figures</strong> you share, or we report, about your social accounts.</li>
        </ul>
        <p><strong>Information collected automatically</strong></p>
        <ul>
          <li><strong>Technical and security data:</strong> IP address, browser and device type, and timestamps, recorded by our hosting and authentication providers to deliver the site and protect accounts.</li>
          <li><strong>Activity in the dashboard:</strong> sign-in times and actions such as approving a piece of work, so the service works and you and our team can see what happened when.</li>
        </ul>
        <p>
          <strong>Payment cards.</strong> You enter card details on Stripe's secure checkout. They go to Stripe, not to us.
        </p>
        <p>
          <strong>Information about other people.</strong> If you upload content showing customers, staff or other people, you're responsible for having the right to
          share it with us.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <>
        <ul>
          <li>to create your account, sign you in and keep it secure;</li>
          <li>to plan, create, deliver and post your content, and to run your dashboard;</li>
          <li>to take payments, manage subscriptions, and keep tax and accounting records;</li>
          <li>to send service emails such as account confirmation, password resets, invites and delivery notices;</li>
          <li>to reply to enquiries and give support;</li>
          <li>to send our newsletter, only if you've asked for it;</li>
          <li>to prevent fraud, abuse and security incidents, and to enforce our Terms;</li>
          <li>to improve our service and fix problems;</li>
          <li>to meet legal obligations.</li>
        </ul>
        <p>
          With your permission and once your content is published, we may show it in our portfolio, as described in our Terms. We don't use your information for
          automated decisions that have legal or similarly significant effects on you.
        </p>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Legal bases (EU and UK)",
    body: (
      <>
        <p>If you're in the European Economic Area or the United Kingdom, we rely on:</p>
        <ul>
          <li><strong>contract:</strong> to provide the services you've ordered and run your account;</li>
          <li><strong>legitimate interests:</strong> to keep the service secure, prevent fraud, improve the service and reply to enquiries;</li>
          <li><strong>consent:</strong> for the newsletter, which you can withdraw at any time;</li>
          <li><strong>legal obligation:</strong> to keep financial records and respond to lawful requests.</li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>
          <strong>We don't sell your personal information</strong>, and we don't share it for cross-context behavioural advertising. We share it only with:
        </p>
        <ul>
          <li><strong>Supabase:</strong> accounts, sign-in, our database and file storage;</li>
          <li><strong>Stripe:</strong> payments and subscriptions;</li>
          <li><strong>Cloudflare and Netlify:</strong> hosting and delivery of the website;</li>
          <li><strong>Our email delivery provider</strong> (such as Resend): account and service emails;</li>
          <li><strong>Google:</strong> if you choose Google sign-in, and for web fonts that load from Google's servers;</li>
          <li><strong>Image and video hosts</strong> (such as Unsplash and Streamable) that serve some media on our website;</li>
          <li><strong>Our team, contractors and creators</strong> who work on your content, only what they need, under confidentiality obligations;</li>
          <li><strong>Authorities or other parties</strong> when the law requires it, or to protect rights, safety and security;</li>
          <li><strong>A buyer or successor</strong> if our business is merged, sold or restructured, under the same protections.</li>
        </ul>
        <p>Our providers process data on our instructions and may not use it for their own purposes, except where their own terms and the law allow (for example, Stripe's fraud prevention).</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <p>We only use storage the site needs to work. We don't use advertising cookies, tracking pixels or analytics tools. Your browser stores:</p>
        <ul>
          <li>your sign-in session, so you stay logged in;</li>
          <li>your cart, so it's still there when you come back;</li>
          <li>your light or dark theme choice.</li>
        </ul>
        <p>
          You can clear these in your browser settings at any time; you'll be signed out and your cart emptied. Stripe sets its own cookies on its checkout pages for
          fraud prevention. If we ever add analytics or marketing tools, we'll update this policy and ask for consent where required.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Where your data is stored",
    body: (
      <p>
        Our database and file storage are hosted by Supabase in Japan (Tokyo region). Our other providers may process data in the United States and other countries.
        Where data leaves the EEA or the UK, we rely on our providers' legal safeguards, such as the European Commission's Standard Contractual Clauses, and Japan's
        adequacy decision.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li><strong>Account, brief, files and dashboard records:</strong> while your account is open, and deleted within 90 days after you close it or ask us to delete it.</li>
        <li><strong>Orders, payments and invoices:</strong> 7 years, for tax and accounting.</li>
        <li><strong>Contact form enquiries:</strong> up to 2 years after our last contact, unless you become a client.</li>
        <li><strong>Newsletter:</strong> until you unsubscribe.</li>
        <li><strong>Security logs:</strong> for the limited periods our providers keep them.</li>
        <li><strong>Published content</strong> you've approved stays wherever you've published it; we can remove it from our portfolio on request.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <>
        <p>
          Data is encrypted in transit (HTTPS). Database access rules mean each client can only see their own business's data, and only our team can see client
          records. Passwords are hashed, payment cards never reach our systems, staff access is limited to what each role needs, and a strict content security policy
          blocks unknown scripts on our site.
        </p>
        <p>
          No system is perfectly secure. If a breach affecting your personal information happens, we'll notify you and the relevant authorities where the law
          requires.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>Depending on where you live, you can ask us to:</p>
        <ul>
          <li>tell you what personal information we hold about you and give you a copy;</li>
          <li>correct information that's wrong;</li>
          <li>delete your information, subject to what we must keep by law;</li>
          <li>give you your data in a portable format;</li>
          <li>stop or limit some uses, or object to processing based on legitimate interests;</li>
          <li>withdraw consent, such as for the newsletter.</li>
        </ul>
        <p>
          Email <Email /> from the address on your account. We'll confirm your identity and reply within 30 days (45 days where US state law allows). You can use an
          authorised agent; we'll ask them for proof. We won't treat you differently for using these rights.
        </p>
        <p>
          <strong>California and other US states.</strong> In the last 12 months we've collected the categories in section 2 for the purposes in section 3, and shared
          them only as described in section 5. We don't sell or share personal information for cross-context behavioural advertising, and we don't use sensitive
          personal information to infer characteristics about you.
        </p>
        <p>
          <strong>EEA and UK.</strong> You also have the right to complain to your local data protection authority. We'd appreciate the chance to resolve it with you
          first.
        </p>
      </>
    ),
  },
  {
    id: "emails",
    title: "Emails from us",
    body: (
      <p>
        Service emails (confirmations, password resets, invites, delivery and billing notices) are part of running your account. Newsletter and marketing emails are
        only sent if you've opted in, and every one has an unsubscribe link.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Our services are for businesses and people aged 18 or over. We don't knowingly collect information from children. If you think a child has given us personal
        information, email <Email /> and we'll delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We'll update this policy when our service or providers change. The effective date at the top shows the latest version, and for material changes we'll notify
        clients by email or in the dashboard before they take effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions or requests: <Email />. {COMPANY} (doing business as Socialio), Bensalem, Pennsylvania, United States.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      effective={EFFECTIVE}
      intro={
        <p>
          This explains what personal information Socialio collects, why, who it's shared with, how long we keep it, and the choices you have. It describes what the
          site actually does today.
        </p>
      }
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
