import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, ChevronDown, MonitorPlay, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import { useState, useEffect } from "react";
import { servicesData } from "../data/services";


export default function NavBar() {
  const { pathname } = useLocation();
  const { items, setIsCartOpen } = useCart();
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll behavior for quiet nav
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    return pathname === path 
      ? "text-primary font-bold pb-1 font-label-md text-label-md" 
      : "text-on-surface/70 font-body-md hover:text-primary transition-colors duration-300 font-label-md text-label-md";
  };

  const isMobileActive = (path: string) => {
    return pathname === path 
      ? "text-primary font-bold block" 
      : "text-on-surface-variant hover:text-white block transition-colors duration-300";
  };

  return (
    <>
      <nav 
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-white/10 shadow-sm py-0' : 'bg-transparent border-transparent py-2'}`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Socialio" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 relative">
            <Link to="/" className={isActive("/")}>Home</Link>
            
            {/* Services Mega Menu Toggle */}
            <Link
              to="/services"
              className={`flex items-center gap-1 transition-colors ${activeDropdown === 'services' || pathname.startsWith('/service') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
              onMouseEnter={() => setActiveDropdown('services')}
            >
              Services <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
            </Link>

            <Link to="/case-studies" className={isActive("/case-studies")}>Case Studies</Link>

            {/* Company Mega Menu Toggle */}
            <Link
              to="/about"
              className={`flex items-center gap-1 transition-colors ${activeDropdown === 'company' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
              onMouseEnter={() => setActiveDropdown('company')}
            >
              Company <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'company' ? 'rotate-180' : ''}`} />
            </Link>
            <Link to="/pricing" className={isActive("/pricing")}>Pricing</Link>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative text-on-surface-variant hover:text-primary transition-colors group"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-background font-sans text-[10px] flex items-center justify-center rounded-full font-bold">
                  {items.length}
                </span>
              )}
            </button>
            <Link to="/contact" className="hidden md:inline-block border border-white/10 bg-white text-black px-6 py-2 font-bold text-sm transition-all duration-300 hover:bg-gray-200">
              Client Login
            </Link>
            <Link to="/contact" className="hidden md:inline-block bg-primary text-background px-6 py-2 font-bold text-sm transition-all duration-300 hover:bg-primary-hover">
              Get Started
            </Link>
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mega Menus Dropdowns directly attached to navbar for seamless hovering */}
        <div className={`hidden md:block absolute top-full left-0 w-full bg-surface-container border-b border-white/10 shadow-2xl transition-all duration-300 overflow-hidden origin-top ${activeDropdown ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 pointer-events-none'}`}>
           <div className="max-w-7xl mx-auto px-6 py-8" onMouseLeave={() => setActiveDropdown(null)}>
              {activeDropdown === 'services' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                   <div className="lg:col-span-1 border-r border-white/5 pr-8">
                      <h4 className="font-mono text-xs text-primary uppercase tracking-widest font-bold mb-4">Core Services</h4>
                      <p className="font-sans text-on-surface-variant text-sm leading-relaxed mb-6">Explore our productized growth solutions designed to scale your operations instantly.</p>
                      <Link to="/services" className="text-sm font-bold text-white hover:text-primary transition-colors flex items-center gap-2" onClick={() => setActiveDropdown(null)}>View All Services &rarr;</Link>
                   </div>
                   <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                     {servicesData.map(service => (
                       <Link 
                         key={service.id} 
                         to={`/service/${service.id}`} 
                         onClick={() => setActiveDropdown(null)}
                         className="group block"
                       >
                         <h5 className="font-display font-bold text-white group-hover:text-primary transition-colors mb-2 flex items-center gap-2">
                           <MonitorPlay className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                           {service.title}
                         </h5>
                         <p className="font-sans text-xs text-on-surface-variant line-clamp-2">{service.description}</p>
                       </Link>
                     ))}
                   </div>
                </div>
              )}
              {activeDropdown === 'company' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                   <Link to="/about" onClick={() => setActiveDropdown(null)} className="group bg-background p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                      <h3 className="font-display text-lg font-bold text-white mb-2">About Us</h3>
                      <p className="text-sm text-on-surface-variant font-sans">Learn about our mission to productize the marketing agency model.</p>
                   </Link>
                   <Link to="/industries" onClick={() => setActiveDropdown(null)} className="group bg-background p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                      <h3 className="font-display text-lg font-bold text-white mb-2">Industries We Serve</h3>
                      <p className="text-sm text-on-surface-variant font-sans">See how we drive scale in SaaS, E-com, Health, and more.</p>
                   </Link>
                   <Link to="/reviews" onClick={() => setActiveDropdown(null)} className="group bg-background p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                      <h3 className="font-display text-lg font-bold text-white mb-2">Client Reviews</h3>
                      <p className="text-sm text-on-surface-variant font-sans">Read verified reviews from companies successfully scaling with us.</p>
                   </Link>
                   <Link to="/compare" onClick={() => setActiveDropdown(null)} className="group bg-background p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                      <h3 className="font-display text-lg font-bold text-white mb-2">Compare The Alternative</h3>
                      <p className="text-sm text-on-surface-variant font-sans">See why hiring us beats traditional agencies and in-house roles.</p>
                   </Link>
                </div>
              )}
           </div>
        </div>

        {/* Mobile Menu Drawer */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-surface-container border-b border-white/10 shadow-2xl transition-all duration-300 overflow-hidden origin-top ${isMobileMenuOpen ? 'opacity-100 scale-y-100 h-[calc(100vh-80px)] overflow-y-auto' : 'opacity-0 scale-y-0 h-0 pointer-events-none'}`}>
           <div className="px-6 py-8 flex flex-col gap-6">
              <Link to="/" className={isMobileActive("/")}>Home</Link>
              <Link to="/services" className={isMobileActive("/services")}>Services</Link>
              <Link to="/case-studies" className={isMobileActive("/case-studies")}>Case Studies</Link>
              <Link to="/about" className={isMobileActive("/about")}>Company</Link>
              <Link to="/pricing" className={isMobileActive("/pricing")}>Pricing</Link>
              
              <div className="h-[1px] bg-white/10 my-2 w-full"></div>
              
              <Link to="/contact" className="text-center bg-primary text-background px-6 py-3 font-bold text-sm">
                Get Started
              </Link>
              <Link to="/contact" className="text-center border border-white/20 bg-transparent text-white px-6 py-3 font-bold text-sm">
                Client Login
              </Link>
           </div>
        </div>
      </nav>
      <CartDrawer />
    </>
  );
}
