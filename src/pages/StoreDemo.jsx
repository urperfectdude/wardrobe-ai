import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Storefront, TShirt, Sparkle, ShoppingCart, Funnel, X } from '@phosphor-icons/react';
import StoreOutfitCreator from '../components/StoreOutfitCreator';
import StoreItemSuggestor from '../components/StoreItemSuggestor';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

export default function StoreDemo() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('store'); // 'store', 'outfit', 'suggest'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // A simple cart state just for demo purposes
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching store products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (items) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // items can be a single product or array
    const newItems = Array.isArray(items) ? items : [items];
    setCart(prev => [...prev, ...newItems]);
  };

  const categories = ['All', ...new Set(products.map(p => p.category3 || p.category))];
  const filteredProducts = categoryFilter === 'All' 
    ? products 
    : products.filter(p => p.category3 === categoryFilter || p.category === categoryFilter);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      <div style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Store Demo</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Experience AI-powered shopping</p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary btn-icon" style={{ borderRadius: 'var(--radius-full)' }}>
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span style={{
                position: 'absolute',
                top: -5,
                right: -5,
                background: 'hsl(var(--accent))',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem', 
        overflowX: 'auto', 
        paddingBottom: '0.5rem',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none' /* Firefox */
      }}>
        <button 
          className={`btn ${activeTab === 'store' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('store')}
          style={{ flexShrink: 0, borderRadius: 'var(--radius-full)' }}
        >
          <Storefront size={20} /> Browse Store
        </button>
        <button 
          className={`btn ${activeTab === 'outfit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('outfit')}
          style={{ flexShrink: 0, borderRadius: 'var(--radius-full)' }}
        >
          <Sparkle size={20} /> Outfit Creator
        </button>
        <button 
          className={`btn ${activeTab === 'suggest' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('suggest')}
          style={{ flexShrink: 0, borderRadius: 'var(--radius-full)' }}
        >
          <TShirt size={20} /> Match My Item
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB: Browse Store */}
          {activeTab === 'store' && (
            <div>
              {/* Category Filter Pills */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                overflowX: 'auto', 
                paddingBottom: '1rem',
                marginBottom: '1rem',
                scrollbarWidth: 'none'
              }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`chip ${categoryFilter === cat ? 'active' : 'chip-outline'}`}
                    onClick={() => setCategoryFilter(cat)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="product-grid">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)' }} />
                  ))}
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="product-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="product-image" style={{ aspectRatio: '3/4' }}>
                        <img src={product.image_url} alt={product.title} loading="lazy" />
                      </div>
                      <div className="product-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>
                            {product.brand}
                          </div>
                          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {product.title}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>${product.price}</span>
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ padding: '0.25rem 0.75rem', minHeight: '32px' }}
                            onClick={() => addToCart(product)}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Outfit Creator */}
          {activeTab === 'outfit' && (
            <StoreOutfitCreator products={products} addToCart={addToCart} />
          )}

          {/* TAB: Match My Item */}
          {activeTab === 'suggest' && (
            <StoreItemSuggestor products={products} addToCart={addToCart} />
          )}

        </motion.div>
      </AnimatePresence>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
