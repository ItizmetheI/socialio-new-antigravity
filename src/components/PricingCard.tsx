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
    <div className={`group flex flex-col bg-surface-container border ${service.popular ? 'border-primary shadow-[0_0_30px_rgba(221,183,255,0.15)]' : 'border-white/5'} p-8 transition-colors relative text-left h-full rounded-2xl hover:border-white/20 shadow-xl`}>
      {service.popular && (
          <div className="absolute top-0 right-0 mt-8">
            <div className="px-3 py-1 bg-primary/10 text-primary type-level-4">
                Popular
            </div>
          </div>
      )}
      <div className="type-level-4 text-primary mb-4">{service.category}</div>
      <h3 className="type-level-2 text-white mb-4 pr-20">{service.title}</h3>
      <p className="type-level-3 text-sm mb-8 pr-4">{service.description}</p>
      
      {/* Slider Area */}
      <div className="border-y border-white/10 py-6 mb-8 flex-grow flex flex-col justify-between">
        <div className="mt-2">
          <div className="flex justify-between items-center mb-6">
            <span className="type-level-4 text-on-surface-variant">
              {service.sliderSteps[activeStep].label}
            </span>
            <span className="type-level-2 text-white text-3xl">
              ${service.sliderSteps[activeStep].price}
              <span className="text-sm font-normal text-white/50">/mo</span>
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
                e.currentTarget.style.background = `linear-gradient(to right, white ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
              }}
              className="w-full cursor-pointer accent-white"
              style={{ background: 'linear-gradient(to right, white 0%, rgba(255,255,255,0.1) 0%)' }}
            />
          )}

          {service.sliderSteps.length > 1 && (
            <div className="flex justify-between mt-4">
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
           className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${service.popular ? 'bg-white text-black hover:bg-gray-200' : 'bg-transparent border border-white/10 text-white hover:bg-white/5'}`}
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
