import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function Compare() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto text-on-surface">
      <div className="text-center mb-16">
        <div className="font-mono text-xs uppercase tracking-widest text-primary mb-4 font-bold">The Alternative</div>
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 tracking-tighter">Why Choose Socialio?</h1>
        <p className="font-sans text-xl text-on-surface-variant max-w-2xl mx-auto">
          See how our productized model stacks up against the old ways of scaling marketing.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-6 font-display text-xl w-1/4">Feature</th>
              <th className="p-6 font-display text-xl w-1/4 text-white bg-white/5 rounded-t-3xl border-x border-t border-white/10 relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                 Socialio
              </th>
              <th className="p-6 font-display text-xl w-1/4">In-House Hire</th>
              <th className="p-6 font-display text-xl w-1/4">Traditional Agency</th>
            </tr>
          </thead>
          <tbody className="font-sans">
            {[
              { label: "Cost", kb: "Predictable flat rate", inhouse: "$80k+ purely salary", agency: "Expensive retainers & % ad spend" },
              { label: "Speed to Launch", kb: "Days", inhouse: "Months (Hiring pipelines)", agency: "Weeks (Onboarding & pitch decks)" },
              { label: "Expertise", kb: "Full team of specialists", inhouse: "Usually a generalist", agency: "Variable (Depends on who is assigned)" },
              { label: "Contracts", kb: "Pause entirely anytime", inhouse: "Severance packages", agency: "6-12 month lock-ins" },
              { label: "Quality Guarantees", kb: "Refund capabilities on first batch", inhouse: "None", agency: "Rarely offered" },
            ].map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="p-6 font-bold text-white">{row.label}</td>
                <td className="p-6 text-primary bg-white/5 border-x border-white/10 font-bold">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 shrink-0" /> {row.kb}
                  </div>
                </td>
                <td className="p-6 text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0 opacity-50" /> {row.inhouse}
                  </div>
                </td>
                <td className="p-6 text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0 mt-1 opacity-50" /> {row.agency}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-24 max-w-3xl mx-auto text-center bg-surface-container border border-white/10 p-12 rounded-3xl">
        <h2 className="font-display text-4xl font-bold text-white mb-4">Ready to stop overpaying?</h2>
        <p className="font-sans text-on-surface-variant text-lg mb-8">Flat-rate. No lock-ins. Cancel anytime.</p>
        <Link to="/contact" className="inline-block px-8 py-4 bg-white text-black font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-colors duration-300 rounded shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(215,183,255,0.3)]">
          Book a Strategy Call
        </Link>
      </div>
    </div>
  )
}
