import { Star, CheckCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function Reviews() {
  const [filterType, setFilterType] = useState("All");

  const reviews = [
    {
      name: "Alex M.",
      company: "SaaS Growth Co",
      type: "SaaS",
      platform: "Trustpilot",
      text: "The social media strategy they implemented doubled our inbound leads in 3 months. Incredibly transparent and fast execution.",
      rating: 5,
      verified: true
    },
    {
      name: "Sarah J.",
      company: "E-com Apparel",
      type: "E-Commerce",
      platform: "Google",
      text: "UGC videos were a game changer. We dropped our CPA by 45% immediately after testing their creatives.",
      rating: 5,
      verified: true
    },
    {
      name: "David H.",
      company: "B2B Logistics",
      type: "Local Business",
      platform: "Direct",
      text: "Their SEO service is no joke. We're ranking top 3 for our main high-intent keywords now. Highly recommend.",
      rating: 5,
      verified: true
    },
    {
       name: "Jessica R.",
       company: "Luxe Cosmetics",
       type: "E-Commerce",
       platform: "Trustpilot",
       text: "The short-form video package completely changed our TikTok presence. We went from 2k to 50k followers in less than 4 months.",
       rating: 5,
       verified: true
    },
    {
       name: "Michael T.",
       company: "DataSync",
       type: "SaaS",
       platform: "Google",
       text: "Their blog posts are incredibly well-researched. We finally have content that brings in qualified mid-funnel leads.",
       rating: 5,
       verified: true
    },
    {
       name: "Elena G.",
       company: "Creator Studio",
       type: "Agency",
       platform: "Direct",
       text: "We outsource all our client UGC needs to Socialio. Flat rates and incredible quality every single time.",
       rating: 5,
       verified: true
    },
    {
       name: "James L.",
       company: "Urban Roasters",
       type: "Local Business",
       platform: "Google",
       text: "Our Instagram growth exploded after starting their social posts package. We see real foot traffic increases on days they post.",
       rating: 5,
       verified: true
    },
    {
       name: "Amanda C.",
       company: "FitLife Wear",
       type: "E-Commerce",
       platform: "Trustpilot",
       text: "I was skeptical about productized agencies, but the Meta ads creatives they produce beat our in-house team's ads consistently.",
       rating: 5,
       verified: true
    },
    {
       name: "Marcus P.",
       company: "CloudHR",
       type: "SaaS",
       platform: "Direct",
       text: "The SEO backlinks service helped us crack the first page for 'HR software'. Worth every penny.",
       rating: 5,
       verified: true
    },
    {
       name: "Sophie N.",
       company: "Bloom Florals",
       type: "Local Business",
       platform: "Google",
       text: "Beautiful social media posts that capture our brand perfectly. It's like having a full-time designer on staff.",
       rating: 5,
       verified: true
    },
    {
       name: "Kevin D.",
       company: "TechGear Pro",
       type: "E-Commerce",
       platform: "Trustpilot",
       text: "We use their short-form videos across YouTube Shorts and Reels. Engagement is up 300% across the board.",
       rating: 5,
       verified: true
    },
    {
       name: "Rachel W.",
       company: "The Content Hub",
       type: "Agency",
       platform: "Direct",
       text: "A life-saver for agency overflow. Their blog posts scale our delivery without needing to hire more writers.",
       rating: 5,
       verified: true
    },
    {
       name: "Daniel F.",
       company: "FlowState App",
       type: "SaaS",
       platform: "Trustpilot",
       text: "Their UGC videos look completely native to the platforms. The creators they use are very compelling and authentic.",
       rating: 5,
       verified: true
    },
    {
       name: "Chloe V.",
       company: "Vegan Pantry",
       type: "E-Commerce",
       platform: "Google",
       text: "Our CPA sliced in half once we started using their ad creatives. The turnaround time is completely unmatched.",
       rating: 5,
       verified: true
    },
    {
       name: "Brian K.",
       company: "Metro Dentists",
       type: "Local Business",
       platform: "Google",
       text: "They handle our Instagram and short-form videos. Patients literally tell us they came in because of our TikToks.",
       rating: 5,
       verified: true
    },
    {
       name: "Emily S.",
       company: "Social Scale",
       type: "Agency",
       platform: "Direct",
       text: "We white-label their social media management. Our clients love the designs and we love the margins.",
       rating: 5,
       verified: true
    },
    {
       name: "Tom H.",
       company: "BuildRight Tools",
       type: "E-Commerce",
       platform: "Trustpilot",
       text: "We've been using their SEO service for a year. Traffic is up 4x and sales are following closely behind.",
       rating: 5,
       verified: true
    },
    {
       name: "Nina J.",
       company: "Daily Habits",
       type: "Creator",
       platform: "Direct",
       text: "I use their short-form edit service to repurpose my podcast. The hooks and captions are incredibly well done.",
       rating: 5,
       verified: true
    }
  ];

  const filteredReviews = filterType === "All" ? reviews : reviews.filter(r => r.type === filterType);
  const filterOptions = ["All", "E-Commerce", "SaaS", "Local Business", "Agency", "Creator"];

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto text-on-surface">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 tracking-tighter">Client Reviews</h1>
        <p className="font-sans text-xl text-on-surface-variant max-w-2xl mx-auto mb-8">
          Trusted by incredible businesses to drive real, measurable growth. 
        </p>

        <div className="bg-surface-container border border-white/10 rounded-2xl p-6 max-w-2xl mx-auto mb-10 flex flex-col items-center">
            <h2 className="text-white font-display text-2xl font-bold mb-2">4.9 / 5 average</h2>
            <div className="flex items-center gap-1 mb-2">
               <Star className="w-6 h-6 fill-primary text-primary" />
               <Star className="w-6 h-6 fill-primary text-primary" />
               <Star className="w-6 h-6 fill-primary text-primary" />
               <Star className="w-6 h-6 fill-primary text-primary" />
               <Star className="w-6 h-6 fill-primary text-primary" />
            </div>
            <p className="text-on-surface-variant font-mono uppercase tracking-widest text-xs">200+ verified reviews</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {filterOptions.map(option => (
             <button 
                key={option}
                onClick={() => setFilterType(option)}
                className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-widest border transition-all ${filterType === option ? 'bg-primary text-background border-primary font-bold shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]' : 'bg-surface-container text-on-surface-variant border-white/10 hover:bg-white/5 hover:text-white'}`}
             >
                {option}
             </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredReviews.map((review, i) => (
          <div key={i} className="bg-surface-container border border-white/5 p-8 rounded-3xl relative hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-1 mb-6">
              {[...Array(review.rating)].map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="font-sans text-on-surface-variant leading-relaxed text-lg mb-8">"{review.text}"</p>
            <div className="flex items-center justify-between border-t border-white/5 pt-6">
              <div>
                <div className="font-bold text-white mb-1 font-display">{review.name}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-on-surface-variant font-mono uppercase tracking-widest">{review.company}</div>
                  <div className="text-[10px] bg-white/10 text-white rounded px-1.5 py-0.5">{review.type}</div>
                </div>
              </div>
              {review.verified && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                  <div className="text-[10px] text-on-surface-variant opacity-70">via {review.platform}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
