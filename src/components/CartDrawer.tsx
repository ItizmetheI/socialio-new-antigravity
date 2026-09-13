import { useCart } from "../context/CartContext";
import { X, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, removeFromCart, total } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
            onClick={() => setIsCartOpen(false)}
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-surface border-l border-white/5 z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" /> Your Cart
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
    
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-on-surface-variant opacity-50" />
                  </div>
                  <p className="font-sans text-on-surface-variant mb-4">Your cart is currently empty.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-sans text-sm font-bold"
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="bg-surface-container border border-white/5 rounded-2xl p-4 flex gap-4 relative group">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-sans text-base font-bold text-white">{item.title}</h4>
                          <span className="font-sans font-black text-white">${item.price}</span>
                        </div>
                        <div className="font-sans text-xs text-on-surface-variant flex items-center gap-2">
                           <span className="px-2 py-0.5 bg-white/5 rounded-md">{item.type.toUpperCase()}</span>
                           {item.levelLabel} {item.type === 'service' ? '/mo' : ''}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="absolute right-4 bottom-4 p-1.5 text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
    
            {items.length > 0 && (
              <div className="p-6 border-t border-white/5 bg-surface-container-low">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-sans text-on-surface-variant">Estimated Monthly Total</span>
                  <span className="font-sans text-2xl font-black text-white">${total}</span>
                </div>
                
                <Link 
                  to="/contact" 
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-4 bg-white text-black hover:bg-white/90 font-sans text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-center font-sans text-xs text-on-surface-variant mt-4">
                  No payment required right now. We'll finalize your stack on our intro call.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
