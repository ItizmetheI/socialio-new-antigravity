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
  "Socialio is run by KB Tech Inc., a Pennsylvania company. Using the site or buying a plan means you agree to these terms.",
  "Monthly plans renew automatically and you can cancel any time. Cancelling stops the next charge; you keep access until the end of the month you've paid for.",
  "Money-back guarantee: on your first order, if you're not happy with your first delivery, tell us within 14 days and we refund that first payment in full.",
  "Revisions are unlimited for anything that doesn't match the brief you approved. A new idea or a changed brief is a new request.",
  "Once you've paid, the final content we make for you is yours. We may show published work in our portfolio unless you ask us not to.",
  "We can't control Instagram, TikTok or any other platform, and we don't guarantee specific followers, views or sales.",
  "Disputes go to individual arbitration, not court or class actions. You can opt out within 30 days (section 21).",
];

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Who we are and this agreement",
    body: (
      <>
        <p>
          Socialio is a service of {COMPANY}, a Pennsylvania corporation based in Bensalem, Pennsylvania, United States ("Socialio", "we", "us"). These Terms of
          Service ("Terms") are a binding agreement between us and you, or the business you act for ("you", "client").
        </p>
        <p>
          By creating an account, placing an order, or otherwise using socialio.io, the client dashboard or our services, you agree to these Terms and to our{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you're accepting for a business, you confirm you're authorised to bind it.
        </p>
        <p className="font-bold text-white">
          Section 21 requires most disputes to be resolved through individual arbitration and waives class actions and jury trials. Please read it.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Accounts and eligibility",
    body: (
      <>
        <p>You must be at least 18 and able to enter a contract. Our services are for businesses and professionals, not personal or household use.</p>
        <p>
          Keep your account details accurate and your login private. You're responsible for everything done through your account, including by teammates you invite.
          Tell us straight away at <Email /> if you think someone has accessed it without permission.
        </p>
        <p>We may refuse, suspend or close an account that gives false information, misuses the service or breaks these Terms.</p>
      </>
    ),
  },
  {
    id: "services",
    title: "Our services and your orders",
    body: (
      <>
        <p>
          We create social media content and related marketing services, including posts, short-form video, UGC (user-generated-style content made by creators),
          written content and growth services, as described on our website at the time you order. Each order includes what the plan, add-on or approved content plan
          says it includes, and nothing more.
        </p>
        <p>
          After checkout you'll complete an onboarding brief and we'll prepare a content plan. Requests, approvals, revisions and deliveries happen in your dashboard,
          and what's recorded there forms part of our agreement.
        </p>
        <p>
          We may decline a request that falls outside your plan, breaks section 14, or that we can't deliver to our standard. If we can't deliver something you've paid
          for, we'll offer a replacement, a credit or a refund for that item.
        </p>
      </>
    ),
  },
  {
    id: "your-part",
    title: "Your part",
    body: (
      <>
        <p>To deliver on time we need you to:</p>
        <ul>
          <li>complete the onboarding brief and keep your brand kit up to date;</li>
          <li>supply the materials, product samples, logins and approvals we ask for, within a reasonable time;</li>
          <li>review deliveries and give clear, consolidated feedback in the dashboard;</li>
          <li>check that anything you publish is accurate and lawful for your business, including product, health, financial and pricing claims, and any advertising or sponsorship disclosures.</li>
        </ul>
        <p>
          You confirm you have the rights to everything you give us (logos, photos, music, product information, testimonials) and that we can use it to provide the
          services. Delays in your part push our timelines back by the same amount.
        </p>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Turnaround and delivery",
    body: (
      <>
        <p>
          We aim to deliver your first batch within 3 to 5 business days of receiving your completed onboarding brief, and later work on the schedule in your content
          plan or dashboard. Rush delivery is available as a paid add-on where offered.
        </p>
        <p>
          Turnaround times are targets, not guarantees. Creator availability, platform changes and missing inputs can affect them, and we'll tell you if something
          is running late. A delay doesn't on its own entitle you to a refund, but section 8 still applies to your first order.
        </p>
        <p>A piece counts as delivered when it's uploaded to your dashboard, or published to your account where your plan includes posting.</p>
      </>
    ),
  },
  {
    id: "revisions",
    title: "Revisions",
    body: (
      <>
        <p>
          Revisions are unlimited for anything that doesn't match the brief, content plan or request you approved: wrong details, edits that don't follow your brand
          kit, technical problems, and anything we got wrong.
        </p>
        <p>
          A new idea, a new concept, a different format, or a changed brief is a new request, not a revision. It's covered by your plan's allowance or quoted
          separately.
        </p>
        <p>
          Please ask for revisions within 30 days of delivery. A piece is final once you approve it, publish it, or 30 days pass without a revision request.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    title: "Prices, payment and renewals",
    body: (
      <>
        <p>
          Prices are in US dollars and shown at checkout. Payments are processed by Stripe; we never see or store your full card details. You authorise us to charge
          your payment method for your order and, for monthly plans, each renewal.
        </p>
        <p>
          <strong>Monthly plans renew automatically</strong> on the same day each month until you cancel. Each plan's monthly allowance (for example, a number of
          posts or videos) applies to that billing period and doesn't carry over unless we agree otherwise in writing.
        </p>
        <p>
          Prices don't include taxes, which are added where required. We may change prices for future billing periods with at least 30 days' notice by email or in
          your dashboard; the change applies from your next renewal after the notice period, and you can cancel before then.
        </p>
        <p>
          If a payment fails we may pause work until it's resolved. If you think a charge is wrong, contact us at <Email /> first; most problems are fixed the same
          day. Filing a chargeback for a charge you authorised, without contacting us, is a breach of these Terms, and we may suspend the account while it's open.
        </p>
      </>
    ),
  },
  {
    id: "guarantee",
    title: "Money-back guarantee",
    body: (
      <>
        <p>If you're not satisfied with your first delivery, you can get your money back:</p>
        <ul>
          <li>It applies to your first order with us only, once per client and per business.</li>
          <li>Ask within 14 days of the first delivery, by emailing <Email /> or through your dashboard. You don't have to give a reason.</li>
          <li>We refund the full amount of that first payment to the original payment method, normally within 5 to 10 business days.</li>
          <li>Once refunded, the right to use the content from that order ends. Don't publish it, and remove anything already published.</li>
          <li>Later renewals, later orders and add-ons bought separately aren't covered.</li>
        </ul>
        <p>We may refuse a guarantee claim that's clearly abusive, for example a business that has already claimed it under another account.</p>
        <p>Apart from this guarantee, section 3 and where the law requires otherwise, payments aren't refundable.</p>
      </>
    ),
  },
  {
    id: "cancel",
    title: "Cancelling and pausing",
    body: (
      <>
        <p>
          You can cancel a monthly plan at any time by emailing <Email /> or from your account. Cancelling stops future renewals; you keep your plan until the end of
          the period you've already paid for, and work in progress for that period is completed. We don't give partial refunds for the rest of a billing period.
        </p>
        <p>If you'd like to pause rather than cancel, ask us; we'll confirm what pausing means for your plan.</p>
        <p>
          We may suspend or end your plan if you seriously or repeatedly break these Terms, don't pay, or use the service in a way that puts us, our creators or
          others at legal risk. If we end a plan without cause, we'll refund the unused part of the current period.
        </p>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Who owns the content",
    body: (
      <>
        <p>
          <strong>Your materials stay yours.</strong> You give us a licence to use them only to provide the services to you.
        </p>
        <p>
          <strong>Final deliverables become yours once paid.</strong> When the order is paid in full, we assign to you our rights in the final versions of the
          content we deliver, so you can use, edit and publish it in your marketing, including organic and paid social, without further payment to us.
        </p>
        <p>We keep ownership of:</p>
        <ul>
          <li>drafts, concepts and versions you didn't approve;</li>
          <li>our templates, processes, tools and know-how, which we may keep using for other work;</li>
          <li>third-party elements such as stock footage, music, fonts and platform effects. These are licensed, not owned, and you must follow their licence terms. We'll tell you about any notable limits.</li>
        </ul>
        <p>
          <strong>UGC and creators.</strong> Creators appear in your content under agreements we arrange. Unless your plan says otherwise, you may use UGC deliverables
          to market your own business, in organic and paid channels. You may not present a creator as endorsing anything beyond what the content shows, or use their
          likeness in new content without their consent.
        </p>
        <p>Until payment is complete, any use of the deliverables is under a temporary licence that ends if payment isn't made or is reversed.</p>
      </>
    ),
  },
  {
    id: "portfolio",
    title: "Our portfolio",
    body: (
      <p>
        Once content has been published by you, we may show it, along with your business name and logo, in our portfolio, website, case studies and social channels.
        We never share confidential information or results you haven't made public. To opt out, email <Email /> at any time and we'll stop new uses and remove it
        from our website within a reasonable time.
      </p>
    ),
  },
  {
    id: "platforms",
    title: "Your social accounts and the platforms",
    body: (
      <>
        <p>
          If you give us access to your social accounts, you authorise us to post, schedule and engage on your behalf as agreed. You can remove our access at any time.
          Please give access through the platform's own team or partner features where they exist, rather than sharing your password.
        </p>
        <p>
          Instagram, TikTok, Facebook, LinkedIn, YouTube, X and other platforms are run by third parties. We don't control their algorithms, reach, rules,
          moderation, outages or account decisions. We work within their published rules, but we aren't responsible for limits, removals, suspensions or lost reach
          caused by a platform's own decisions or rule changes.
        </p>
      </>
    ),
  },
  {
    id: "results",
    title: "No guaranteed results",
    body: (
      <p>
        We work to make content that performs, but social media results depend on many things we don't control. We don't guarantee any particular number of
        followers, views, engagement, leads, rankings, backlinks or sales. Figures shared on our website or in case studies describe past work and aren't a promise of
        future results. Your money-back guarantee is section 8.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "What we won't make",
    body: (
      <>
        <p>We won't create or post content, and you may not use the service, for anything that:</p>
        <ul>
          <li>is illegal, or promotes illegal products, services or activities;</li>
          <li>is false or misleading, including fake reviews or testimonials, or health, financial or results claims you can't support;</li>
          <li>infringes someone else's copyright, trademark, privacy or publicity rights;</li>
          <li>is hateful, harassing, sexually explicit, or exploits minors;</li>
          <li>breaks the rules of the platform it's made for.</li>
        </ul>
        <p>We may refuse or remove such work, and repeated or serious breaches are grounds to end the plan without a refund.</p>
      </>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <p>
        We each keep the other's non-public business information confidential and use it only for our work together, except where it's already public, received
        lawfully from someone else, or must be disclosed by law. Our team and creators who see your information are bound by confidentiality obligations.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    body: (
      <p>
        The service relies on providers such as Stripe (payments), Supabase (accounts, data and file storage) and our hosting and email providers. Their own terms
        apply to the parts they run. We're not responsible for their outages or acts, but we choose them carefully and replace them if they don't meet our standards.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        Apart from the commitments written in these Terms, including the money-back guarantee, the service and all content are provided "as is" and "as available".
        To the fullest extent the law allows, we disclaim all other warranties, express or implied, including merchantability, fitness for a particular purpose and
        non-infringement. We don't promise the website or dashboard will always be available or error-free.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limits on liability",
    body: (
      <>
        <p>To the fullest extent the law allows:</p>
        <ul>
          <li>
            neither of us is liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data, followers or goodwill,
            even if warned they were possible;
          </li>
          <li>
            our total liability for all claims relating to the services or these Terms is limited to the amount you paid us in the 3 months before the event that gave
            rise to the claim.
          </li>
        </ul>
        <p>These limits don't apply to liability that can't legally be limited, such as for fraud or wilful misconduct.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Your responsibility for claims",
    body: (
      <p>
        You'll defend and compensate us, our team and our creators against third-party claims, and the costs that result, arising from materials you provided, claims
        about your products or services, content you approved or changed, or your breach of these Terms or the law. We'll tell you promptly about any such claim and
        cooperate reasonably.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Ending this agreement",
    body: (
      <p>
        You can stop using the service and close your account at any time. Sections that by their nature should continue (including payment owed, ownership,
        portfolio, confidentiality, disclaimers, limits on liability, your responsibility for claims, and disputes) continue after the agreement ends.
      </p>
    ),
  },
  {
    id: "disputes",
    title: "Disputes and arbitration",
    body: (
      <>
        <p>
          <strong>Talk to us first.</strong> If you have a problem, email <Email /> with a description and what you'd like us to do. We'll try in good faith to resolve
          it within 30 days, and so will you before starting any formal proceedings.
        </p>
        <p>
          <strong>Binding arbitration.</strong> If it isn't resolved, any dispute arising from these Terms or the services will be decided by binding arbitration on an
          individual basis, administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules (or its Consumer Arbitration Rules where
          they apply), before one arbitrator. The arbitration may be held by video, or in Bucks County, Pennsylvania. The arbitrator's decision can be entered as a
          judgment in any court with jurisdiction.
        </p>
        <p>
          <strong>Exceptions.</strong> Either of us may bring an individual claim in small claims court, and either of us may go to court to stop infringement or misuse
          of intellectual property or confidential information.
        </p>
        <p>
          <strong>No class actions or juries.</strong> Claims may only be brought individually, not as a plaintiff or class member in any class, collective or
          representative proceeding. Both of us waive the right to a jury trial.
        </p>
        <p>
          <strong>Your right to opt out.</strong> You can opt out of this arbitration agreement by emailing <Email /> within 30 days of first accepting these Terms,
          with your name, account email and a clear statement that you're opting out. If you do, disputes go to the courts described below.
        </p>
        <p>
          <strong>Governing law and courts.</strong> These Terms are governed by the laws of the Commonwealth of Pennsylvania and, for arbitration, the Federal
          Arbitration Act, without regard to conflict-of-law rules. Any dispute not subject to arbitration will be heard in the state or federal courts located in
          Bucks County, Pennsylvania, and we both consent to their jurisdiction.
        </p>
        <p>If the class action waiver is found unenforceable for a claim, that claim (and only that claim) goes to court instead of arbitration.</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms as the service changes. For material changes we'll give at least 14 days' notice by email or in your dashboard. The new Terms apply
        from the date shown, and continuing to use the service after that means you accept them. Changes don't apply to disputes that arose before they took effect.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          These Terms, the Privacy Policy and what you approve in your dashboard are the whole agreement between us about the services. If any part is found
          unenforceable, the rest still applies. Not enforcing a right isn't a waiver of it.
        </p>
        <p>
          You may not transfer this agreement without our written consent; we may transfer it as part of a merger, acquisition or sale of the business. Neither of us
          is responsible for delays caused by events outside reasonable control, such as outages, natural disasters or platform failures. We may send notices to the
          email on your account; you can send notices to <Email />.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {COMPANY} (doing business as Socialio), Bensalem, Pennsylvania, United States. Email <Email />.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      effective={EFFECTIVE}
      intro={
        <p>
          These terms cover how Socialio works: what you get, how billing, revisions and refunds work, who owns the content, and what happens if something goes wrong.
          We've written them to be read, not skimmed past.
        </p>
      }
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
