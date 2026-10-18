export const servicesData = [
  {
    id: "social-media-posts",
    title: "Social Media Posts",
    category: "Social Media",
    description: "Branded graphics and copy delivered monthly — ready to post on Instagram, Facebook, LinkedIn, or X.",
    longDescription: "We handle everything — visuals, captions, hashtags, and scheduling. Your brand stays consistent and professional every single month without you lifting a finger.",
    sliderSteps: [
      { label: "10 Posts", amount: 10, price: 79 },
      { label: "20 Posts", amount: 20, price: 179 },
      { label: "30 Posts", amount: 30, price: 279 },
    ],
    features: ["Dedicated account manager", "Custom graphic design", "Platform-optimized captions", "Hashtag strategy", "Content calendar", "Scheduled posting"],
    proofs: [
      { value: "3–5 days", label: "Average Delivery Time", desc: "From brief to ready-to-post graphics in your inbox." },
      { value: "∞", label: "Revision Rounds", desc: "We iterate until every post matches your brand perfectly." },
    ],
    process: [
      { title: "Brand Intake", desc: "You fill out a short brand questionnaire covering your tone, colors, audience, and content pillars." },
      { title: "Content Calendar Draft", desc: "We plan the month's posts, themes, and copy angles before a single graphic is made." },
      { title: "Design & Copywriting", desc: "Our designers and copywriters produce every post as a matched pair — visual and caption together." },
      { title: "Delivery & Approval", desc: "Posts are delivered in a shared folder. You approve, request changes, or post directly." },
    ]
  },
  {
    id: "short-form-videos",
    title: "Short-Form Videos",
    category: "Social Media",
    description: "Scroll-stopping Reels and TikToks edited natively for the algorithm. Hooks, captions, and trending audio included.",
    longDescription: "We script, edit, caption and optimize short-form vertical videos tailored to TikTok, Instagram Reels, and YouTube Shorts algorithm trends.",
    sliderSteps: [
      { label: "5 Videos", amount: 5, price: 129 },
      { label: "10 Videos", amount: 10, price: 259 },
      { label: "15 Videos", amount: 15, price: 369 },
      { label: "20 Videos", amount: 20, price: 459 },
      { label: "25 Videos", amount: 25, price: 529 },
    ],
    features: ["Script writing", "Vertical video editing", "Trending audio selection", "Animated captions", "Viral hook creation", "Platform-native formatting"],
    popular: true,
    proofs: [
      { value: "3 sec", label: "Hook Window Targeted", desc: "Every video is engineered to capture attention before the viewer can scroll." },
      { value: "2–4x", label: "Avg Engagement Lift", desc: "Clients typically see 2–4x more engagement vs static posts within the first month." },
    ],
    process: [
      { title: "Hook Research", desc: "We analyze trending formats and competitor content in your niche to identify what's working right now." },
      { title: "Scripting", desc: "Every video gets a punchy script — hook, body, and CTA — written for the platform it's going on." },
      { title: "Editing & Captions", desc: "We edit with native-feeling cuts, trending audio, and animated captions that drive watch time." },
      { title: "Platform Delivery", desc: "Videos are exported in optimal specs for Reels, TikTok, and Shorts separately." },
    ]
  },
  {
    id: "ugc-content",
    title: "UGC Videos",
    category: "Ad Creative",
    description: "Authentic creator-led videos that feel native, build trust, and convert better than any polished ad.",
    longDescription: "We source vetted creators, handle all logistics, script the content, and deliver authentic UGC videos that outperform traditional ads.",
    sliderSteps: [
      { label: "3 Videos", amount: 3, price: 549 },
      { label: "6 Videos", amount: 6, price: 1099 },
      { label: "9 Videos", amount: 9, price: 1649 },
    ],
    features: ["Creator sourcing", "Scripting and direction", "Product seeding", "Full usage rights", "Raw files included"],
    proofs: [
      { value: "–38%", label: "Avg CPA Reduction", desc: "UGC consistently outperforms polished ads in cost-per-acquisition across verticals." },
      { value: "100%", label: "Usage Rights Included", desc: "You own every video outright — run it as an ad, post it organically, repurpose it anywhere." },
    ],
    process: [
      { title: "Creator Briefing", desc: "We write a detailed creative brief covering talking points, tone, and any product claims to include." },
      { title: "Content Production", desc: "Creators film their authentic take. We do not over-direct — authenticity is the whole point." },
      { title: "Review & Light Edit", desc: "We review for brand safety and make light edits (captions, trimming) without killing the raw feel." },
      { title: "Full Rights Transfer", desc: "Final files are delivered with full commercial usage rights, ready to run as paid ads or organic posts." },
    ]
  },
  {
    id: "seo-blog-posts",
    title: "Blog Post",
    category: "SEO",
    description: "Long-form, keyword-targeted articles written to rank on Google and drive compounding organic traffic.",
    longDescription: "We research low-competition, high-intent keywords and write authoritative 1,500+ word posts that rank and bring in qualified traffic month after month.",
    sliderSteps: [
      { label: "2 Posts", amount: 2, price: 99 },
      { label: "4 Posts", amount: 4, price: 179 },
      { label: "6 Posts", amount: 6, price: 249 },
    ],
    features: ["Keyword research", "1,500+ word articles", "SEO-optimized formatting", "Internal linking", "Meta descriptions"],
    proofs: [
      { value: "1,500+", label: "Words Per Post", desc: "Longer, more authoritative posts consistently outrank thin content on competitive keywords." },
      { value: "Top 10", label: "Target Ranking Position", desc: "Every post is built around a keyword with a realistic path to page one." },
    ],
    process: [
      { title: "Keyword Research", desc: "We identify low-competition, high-intent keywords with real traffic potential for your domain's current authority." },
      { title: "Outline & Brief", desc: "A detailed outline is created covering headings, target keywords, internal linking opportunities, and competitor gaps." },
      { title: "Long-Form Writing", desc: "Our SEO writers produce in-depth, expert-level articles — no AI-spun filler, no keyword stuffing." },
      { title: "On-Page Optimization", desc: "Meta title, meta description, schema markup, image alt tags, and internal links are all handled before delivery." },
    ]
  },
  {
    id: "seo-backlinks",
    title: "SEO Backlinks",
    category: "SEO",
    description: "Manual outreach to high-DR websites to build your domain authority and push your pages up the rankings.",
    longDescription: "We run manual white-hat outreach to secure contextual backlinks from reputable, high-traffic websites in your niche.",
    sliderSteps: [
      { label: "3 Backlinks", amount: 3, price: 249 },
      { label: "6 Backlinks", amount: 6, price: 479 },
      { label: "12 Backlinks", amount: 12, price: 899 },
    ],
    features: ["DR 50+ sites only", "Manual outreach", "Contextual placement", "White-hat only", "Full reporting"],
    proofs: [
      { value: "DR 50+", label: "Minimum Domain Rating", desc: "We only secure links from sites with meaningful authority — no link farms or PBNs." },
      { value: "100%", label: "White-Hat Only", desc: "Every link is earned through genuine outreach. Safe for any Google algorithm update." },
    ],
    process: [
      { title: "Prospect Research", desc: "We build a targeted list of high-DR websites in your niche that accept contextual guest content." },
      { title: "Outreach Campaign", desc: "Our team conducts personalized manual outreach — no mass email blasts, no templates." },
      { title: "Content Creation", desc: "We write out guest article or resource that earns the link, matching the host site's style and quality." },
      { title: "Link Verification", desc: "Every placed link is verified live and reported with the URL, anchor text, and DR of the source site." },
    ]
  },
  {
    id: "instagram-growth",
    title: "Instagram Growth",
    category: "Social Media",
    description: "Targeted community engagement to grow your follower count with real accounts in your niche.",
    longDescription: "We grow your Instagram with manual community engagement, strategic commenting, and niche targeting so every new follower is a real person who cares about your brand.",
    sliderSteps: [
      { label: "Monthly", amount: 1, price: 129 },
    ],
    features: ["Manual engagement only", "Niche targeting", "Competitor follower targeting", "Monthly growth reports", "No bots or automation"],
    proofs: [
      { value: "+500", label: "Avg Monthly Followers", desc: "Real accounts in your niche — not bots, not bought followers." },
      { value: "Niche-only", label: "Targeting Method", desc: "We only engage with users who actually care about your content category." },
    ],
    process: [
      { title: "Account Audit", desc: "We review your profile, bio, content, and current follower quality before touching anything." },
      { title: "Niche Targeting Setup", desc: "We identify the exact hashtags, competitor accounts, and audience segments to engage with." },
      { title: "Daily Engagement", desc: "Manual community engagement runs daily — comments, follows, and interactions with real targeted users." },
      { title: "Monthly Reporting", desc: "You receive a monthly follower growth report showing net new followers, engagement rate change, and profile visit trends." },
    ]
  }
];

export const addOnsData = [
  {
    id: "rush-delivery",
    title: "Rush Delivery (48h)",
    price: 49,
    description: "Skip the queue. Get your assets delivered twice as fast when you need them urgently."
  },
  {
    id: "platform-audit",
    title: "Platform Strategy Audit",
    price: 99,
    description: "A deep-dive technical audit of your social profiles to uncover hidden growth blockers."
  }
];
