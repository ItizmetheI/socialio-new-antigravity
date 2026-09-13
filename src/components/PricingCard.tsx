import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function PricingCard({ service }: React.PropsWithChildren<{ service: any }>) {
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = service.sliderSteps[activeStep];
  const { addToCart, setIsCartOpen } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      serviceId: service.id,
      title: service.title,
      price: currentStep.price,
      levelLabel: currentStep.label,
      type: 'service'
    });
    setIsCartOpen(true);
  };

  return (
    <div className={`group flex flex-col bg-surface-container border ${service.popular ? 'border-primary/30 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.15)]' : 'border-white/5'} rounded-3xl p-8 transition-colors relative overflow-hidden text-left shadow-lg h-full`}>
      {service.popular && (
          <div className="absolute top-0 right-0 p-6">
            <div className="px-3 py-1 bg-primary/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest font-mono">
                Popular
            </div>
          </div>
      )}
      <div className="font-mono text-[10px] text-primary uppercase tracking-widest font-bold mb-3">{service.category}</div>
      <h3 className="font-display text-2xl font-bold text-white mb-2 pr-20">{service.title}</h3>
      <p className="text-on-surface-variant text-sm mb-6 leading-relaxed font-sans line-clamp-2">{service.description}</p>
      
      {/* Slider Area */}
      <div className="bg-background rounded-xl p-6 border border-white/5 mb-6 flex-grow flex flex-col justify-between">
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
              {service.sliderSteps[activeStep].label}
            </span>
            <span className="font-display font-bold text-2xl text-white">
              ${service.sliderSteps[activeStep].price}
              <span className="text-xs font-sans font-normal text-on-surface-variant">/mo</span>
            </span>
          </div>

          {service.sliderSteps.length > 1 && (
            <input
              type="range"
              min={0}
              max={service.sliderSteps.length - 1}
              step={1}
              value={activeStep}
              onChange={(e) => {
                const val = Number(e.target.value);
                setActiveStep(val);
                const pct = (val / (service.sliderSteps.length - 1)) * 100;
                e.currentTarget.style.background = `linear-gradient(to right, var(--color-primary, #a78bfa) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
              }}
              className="w-full accent-primary cursor-pointer"
              style={{ background: 'linear-gradient(to right, var(--color-primary, #a78bfa) 0%, rgba(255,255,255,0.1) 0%)' }}
            />
          )}

          {service.sliderSteps.length > 1 && (
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[10px] text-on-surface-variant">
                {service.sliderSteps[0].label}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {service.sliderSteps[service.sliderSteps.length - 1].label}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto flex flex-col gap-4">
        <button 
           onClick={handleAddToCart}
           className="w-full py-4 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center justify-center gap-2 border border-white/10"
        >
          <ShoppingCart className="w-4 h-4" /> Add to Cart
        </button>
        <Link 
          to={`/service/${service.id}`}
          className="w-full text-center text-xs font-mono uppercase tracking-widest text-on-surface-variant hover:text-white"
        >
          View Details &rarr;
        </Link>
      </div>
    </div>
  )
}
