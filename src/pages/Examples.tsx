import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

const tabs = [
  "All",
  "Social Media Posts",
  "Short-Form Videos",
  "UGC Videos",
  "Blog Content",
  "SEO & Backlinks"
];

// Same gradient-tile language as Home's feed/portfolio sections — until real
// client work has somewhere to live, an honest gradient beats lorem-picsum
// filler photos pretending to be client deliverables.
const gradients = [
  "radial-gradient(120% 100% at 20% 15%, #6c4fa3 0%, #241a38 60%, #100c18 100%)",
  "radial-gradient(120% 100% at 75% 15%, #ff9169 0%, #a83e22 55%, #24100a 100%)",
  "radial-gradient(120% 100% at 25% 85%, #4fc7c2 0%, #1c5f60 55%, #0a1e1e 100%)",
  "radial-gradient(120% 100% at 80% 80%, #e2c1ff 0%, #6f4a99 55%, #1f1330 100%)",
  "radial-gradient(120% 100% at 30% 20%, #ffd166 0%, #a86a1c 55%, #241804 100%)",
  "radial-gradient(120% 100% at 70% 80%, #7fb8ff 0%, #2f5c94 55%, #0c1a2e 100%)",
];

// 16 placeholder tiles, categories distributed evenly and aspect ratios mixed
const portfolioItems = Array.from({ length: 16 }).map((_, i) => ({
  id: i,
  category: tabs[(i % 5) + 1], // skip "All"
  aspect: ["aspect-square", "aspect-video", "aspect-[9/16]"][i % 3],
  gradient: gradients[i % gradients.length],
}));

export default function Examples() {
  const [activeTab, setActiveTab] = useState("All");

  const filteredItems = activeTab === "All" ? portfolioItems : portfolioItems.filter(item => item.category === activeTab);

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto text-on-surface">
      <div className="text-center mb-16">
        <h1 className="hero-display font-bold text-5xl md:text-6xl text-white mb-6 tracking-tight">A curated look at what we <span className="italic text-primary">build.</span></h1>
        <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">
          A cross-section of the deliverables we ship for clients every month.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-16 max-w-4xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-widest border transition-all font-bold ${activeTab === tab ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:bg-white/10'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`break-inside-avoid rounded-2xl overflow-hidden relative group bg-surface-container ${item.aspect}`}>
             <div
               className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
               style={{ background: item.gradient }}
             />
             <div className="absolute top-4 left-4 z-20">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10">
                  {item.category}
                </div>
             </div>
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <div className="text-white flex items-center gap-2 text-xl font-bold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {item.category} <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}
