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
    <div className={`group flex flex-col bg-transparent border-t ${service.popular ? 'border-primary border-x px-6 -mx-6' : 'border-white/10'} pt-8 pb-8 transition-colors relative text-left h-full`}>
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
      <div className="border border-white/10 p-6 mb-8 flex-grow flex flex-col justify-between">
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
           className={`w-full py-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${service.popular ? 'bg-primary text-black hover:bg-primary-hover' : 'bg-white text-black hover:bg-gray-200'}`}
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
