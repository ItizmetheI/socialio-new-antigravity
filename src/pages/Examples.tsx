import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

export default function Examples() {
  const [activeTab, setActiveTab] = useState("All");

  const tabs = [
    "All",
    "Social Media Posts",
    "Short-Form Videos",
    "UGC Videos",
    "Blog Content",
    "SEO & Backlinks"
  ];

  // Generate 16 placeholder cards
  const portfolioItems = Array.from({ length: 16 }).map((_, i) => {
    // Distribute categories evenly
    const catIndex = i % 5;
    const category = tabs[catIndex + 1]; // Skip "All"
    // Mix aspect ratios
    const aspectRatios = ["aspect-square", "aspect-video", "aspect-[9/16]"];
    const aspect = aspectRatios[i % 3];

    return {
      id: i,
      category,
      aspect,
      imageUrl: `https://picsum.photos/seed/${i + 100}/800/1000`
    };
  });

  const filteredItems = activeTab === "All" ? portfolioItems : portfolioItems.filter(item => item.category === activeTab);

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto text-on-surface">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 tracking-tighter">Our Work</h1>
        <p className="font-sans text-xl text-on-surface-variant max-w-2xl mx-auto">
          A curated look at what we build for our clients.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-16 max-w-4xl mx-auto">
        {tabs.map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-widest border transition-all ${activeTab === tab ? 'bg-white text-black border-white font-bold' : 'bg-transparent text-white border-white/20 hover:bg-white/10'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`break-inside-avoid rounded-2xl overflow-hidden relative group bg-surface-container ${item.aspect}`}>
             <img 
               src={item.imageUrl} 
               alt={`${item.category} example`} 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
               loading="lazy"
             />
             <div className="absolute top-4 left-4 z-20">
                <div className="font-mono text-[10px] uppercase tracking-widest text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10">
                  {item.category}
                </div>
             </div>
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <div className="text-white flex items-center gap-2 font-display text-xl font-bold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {item.category} <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}
