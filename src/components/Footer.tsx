import { Link } from "react-router-dom";
import { servicesData } from "../data/services";
import { Facebook, Linkedin, Instagram, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";

export default function Footer() {
  const socialCategories = servicesData.filter(s => s.category === "Social Media");
  const otherCategories = servicesData.filter(s => s.category !== "Social Media");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email.includes("@")) {
      setSubmitted(true);
    }
  };

  return (
    <footer className="w-full bg-background border-t border-white/10 pt-20 pb-8 mt-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid-12 w-full gap-y-12 mb-16">
            
            {/* Brand & Newsletter */}
            <div className="col-span-12 lg:col-span-5 pr-8">
                <Logo className="mb-6" />
                <p className="font-sans text-on-surface-variant max-w-sm mb-8">
                  Precision marketing for high-growth teams. We turn digital attention into enterprise value.
                </p>
                <div className="border-t border-white/10 pt-8 mb-8 bg-transparent mt-8">
                   <h5 className="font-bold text-white mb-2 text-sm font-sans flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary"></span> Join the Growth Newsletter
                   </h5>
                   <p className="text-xs text-on-surface-variant mb-4 font-sans">Actionable insights sent weekly.</p>
                   {submitted ? (
                     <div className="flex items-center gap-2 text-primary font-bold text-sm border-l-2 border-primary pl-4 py-2">
                       <CheckCircle2 className="w-5 h-5" /> You're in. Growth incoming.
                     </div>
                   ) : (
                     <div className="flex gap-2">
                       <input 
                         type="email" 
                         placeholder="Email address" 
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                         className="bg-transparent border-b border-white/20 px-2 py-2 text-sm text-white focus:outline-none focus:border-primary flex-grow" 
                       />
                       <button onClick={handleSubmit} className="text-white hover:text-primary transition-colors font-bold type-level-4 flex items-center justify-center px-2">
                         <ArrowRight className="w-5 h-5" />
                       </button>
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-4 text-on-surface-variant">
                   <a href="https://www.facebook.com/share/17oA4Peihv/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
                   <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Linkedin className="w-5 h-5" /></a>
                   <a href="https://www.instagram.com/getsocialio?igsh=MTZ2Y21ucDN1dmRvdg==" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
                </div>
            </div>

            {/* Social Services */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-2">
                <h5 className="type-level-4 text-white mb-6">Social Media</h5>
                <ul className="space-y-4 font-sans text-sm">
                    {socialCategories.map(s => (
                       <li key={s.id}><Link to={`/service/${s.id}`} className="text-on-surface-variant hover:text-white transition-colors block line-clamp-1">{s.title}</Link></li>
                    ))}
                    <li><Link to="/services" className="text-primary hover:text-primary-hover font-bold transition-colors">All Social Services &rarr;</Link></li>
                </ul>
            </div>

            {/* Other Services */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-2">
                <h5 className="type-level-4 text-white mb-6">Growth & Scale</h5>
                <ul className="space-y-4 font-sans text-sm">
                    {otherCategories.map(s => (
                       <li key={s.id}><Link to={`/service/${s.id}`} className="text-on-surface-variant hover:text-white transition-colors block line-clamp-1">{s.title}</Link></li>
                    ))}
                    <li><Link to="/services" className="text-primary hover:text-primary-hover font-bold transition-colors">All Growth Services &rarr;</Link></li>
                </ul>
            </div>

            {/* Company */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-3">
                <h5 className="type-level-4 text-white mb-6">Company</h5>
                <ul className="space-y-4 font-sans text-sm">
                    <li><Link to="/about" className="text-on-surface-variant hover:text-white transition-colors">About Us</Link></li>
                    <li><Link to="/industries" className="text-on-surface-variant hover:text-white transition-colors">Industries We Serve</Link></li>
                    <li><Link to="/reviews" className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2">Client Reviews <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded animate-pulse">New</span></Link></li>
                    <li><Link to="/case-studies" className="text-on-surface-variant hover:text-white transition-colors">Case Studies</Link></li>
                    <li><Link to="/examples" className="text-on-surface-variant hover:text-white transition-colors">Our Work Gallery</Link></li>
                    <li><Link to="/compare" className="text-on-surface-variant hover:text-white transition-colors">Compare</Link></li>
                    <li><Link to="/pricing" className="text-on-surface-variant hover:text-white transition-colors">Pricing</Link></li>
                </ul>
            </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-widest text-on-surface-variant">
               <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Secure Checkout</span>
               <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Vetted Agency</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-xs text-on-surface-variant font-sans">
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <span>© {new Date().getFullYear()} Socialio. All rights reserved.</span>
            </div>
        </div>
      </div>
    </footer>
  );
}
