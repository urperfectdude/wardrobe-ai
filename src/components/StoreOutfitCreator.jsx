import { useState } from 'react';
import { Sparkle, ShoppingCart, UserFocus, MagicWand, SpinnerGap } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { generateTryOn } from '../utils/generateTryOn';
import ImagineMeResultModal from './ImagineMeResultModal';
import AuthModal from './AuthModal';
import MissingDataModal from './MissingDataModal';
import { generateOutfit } from '../utils/outfitMatcher';

const MOODS = [
    { id: 'party', label: 'Party' },
    { id: 'office', label: 'Office' },
    { id: 'casual', label: 'Casual' },
    { id: 'date', label: 'Date Night' },
    { id: 'wedding', label: 'Wedding' },
    { id: 'vacation', label: 'Vacation' },
    { id: 'gym', label: 'Gym' },
    { id: 'brunch', label: 'Brunch' }
];

export default function StoreOutfitCreator({ products, addToCart }) {
  const { userProfile, user, refreshProfile } = useAuth();
  const [selectedMood, setSelectedMood] = useState('casual');
  const [generatedOutfit, setGeneratedOutfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagineResult, setImagineResult] = useState(null);
  const [showImagineModal, setShowImagineModal] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);

  const handleGenerate = () => {
    if (!user) {
        setShowAuthModal(true);
        return;
    }

    setLoading(true);
    
    // Use the outfitMatcher algorithm to pick the best outfit
    setTimeout(() => {
        const outfits = generateOutfit(products, selectedMood, 1);
        
        if (outfits && outfits.length > 0) {
            setGeneratedOutfit(outfits[0].items);
        } else {
            // Fallback if algorithm returns nothing (shouldn't happen with 200 items)
            const tops = products.filter(p => ['T-shirt', 'Shirt', 'Topwear'].includes(p.category) || ['T-shirt', 'Shirt', 'Topwear'].includes(p.category1) || p.category3 === 'Top');
            const bottoms = products.filter(p => ['Jeans', 'Shorts', 'Bottomwear'].includes(p.category) || ['Jeans', 'Shorts', 'Bottomwear'].includes(p.category1) || p.category3 === 'Bottom');
            const shoes = products.filter(p => p.category1 === 'Footwear' || p.category3 === 'Footwear');
            
            const picks = [
                tops[Math.floor(Math.random() * tops.length)],
                bottoms[Math.floor(Math.random() * bottoms.length)],
                shoes[Math.floor(Math.random() * shoes.length)]
            ].filter(Boolean); // remove nulls
            setGeneratedOutfit(picks);
        }
        setLoading(false);
    }, 800);
  };

  const handleImagineMe = async () => {
    if (!user) {
        setShowAuthModal(true);
        return;
    }

    if (!generatedOutfit || generatedOutfit.length === 0) return;
    
    setTryOnLoading(true);

    try {
        const freshProfile = await refreshProfile() || userProfile;
        const isProfileComplete = (freshProfile?.profile_picture || freshProfile?.selfie_url) && freshProfile?.body_type && freshProfile?.skin_color;
        
        if (!isProfileComplete) {
            setTryOnLoading(false);
            setShowMissingDataModal(true);
            return;
        }

        const tryOnImageUrl = await generateTryOn(
          {
            gender: freshProfile?.gender || 'woman',
            age: freshProfile?.age,
            bodyType: freshProfile?.body_type,
            skinColor: freshProfile?.skin_color,
            hairColor: freshProfile?.hair_color,
            preferredStyles: freshProfile?.preferred_styles,
            fitType: freshProfile?.fit_type,
            shoppingChoice: freshProfile?.shopping_choice
          },
          generatedOutfit.map(item => ({
               // map store product to the format expected by generateTryOn
              id: item.id,
              image: item.image_url,
              title: item.title,
              category: item.category3 || item.category
          })),
          freshProfile?.profile_picture || freshProfile?.selfie_url
        );
        
        setImagineResult({
            imagine_on_avatar: tryOnImageUrl,
            items: generatedOutfit,
            description: "Virtual Try-On from Store"
        });
        setShowImagineModal(true);
    } catch (e) {
      console.error(e);
      alert('Failed to generate try on: ' + e.message);
    } finally {
      setTryOnLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
         <div style={{ 
            width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--green-50))', 
            color: 'hsl(var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' 
         }}>
           <Sparkle size={32} weight="fill" />
         </div>
         <h2 style={{ marginBottom: '0.5rem' }}>AI Outfit Creator</h2>
         <p className="text-muted">Let our AI build the perfect outfit for you from our store catalogue, tailored to your style preferences.</p>
      </div>

      {/* Occasion Input */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <input
                type="text"
                value={MOODS.find(m => m.id === selectedMood)?.label || selectedMood || ''}
                onChange={(e) => {
                    const val = e.target.value.toLowerCase().trim()
                    const foundMood = MOODS.find(m => m.label.toLowerCase() === val || m.id === val)
                    setSelectedMood(foundMood ? foundMood.id : val)
                }}
                placeholder="What's the occasion? (e.g., Party, Office, Casual)"
                style={{
                    width: '100%',
                    padding: '0.875rem 3rem 0.875rem 1rem',
                    fontSize: '0.9375rem',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-xl)',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'hsl(var(--primary))'
                    e.target.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.1)'
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'hsl(var(--border))'
                    e.target.style.boxShadow = 'none'
                }}
            />
            <div style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-lg)',
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <MagicWand size={18} />
            </div>
        </div>

        {/* Occasion Chips */}
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'center'
        }}>
            {MOODS.map((mood) => (
                <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    style={{
                        padding: '0.5rem 0.875rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: selectedMood === mood.id ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                        border: `1px solid ${selectedMood === mood.id ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
                        borderRadius: 'var(--radius-full)',
                        color: selectedMood === mood.id ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {mood.label}
                </button>
            ))}
        </div>
      </section>

      <button 
         className="btn btn-primary btn-block" 
         onClick={handleGenerate}
         disabled={loading || !selectedMood}
         style={{ marginBottom: '2rem' }}
      >
        {loading ? <><SpinnerGap className="animate-spin" size={20} /> Curating your look...</> : 'Generate New Outfit'}
      </button>

      {generatedOutfit && (
        <div style={{ 
            background: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius-xl)', 
            padding: '1.5rem' 
        }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', textAlign: 'center' }}>Your Curated Look</h3>
          
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' }}>
            {generatedOutfit.map(item => (
                <div key={item.id} style={{ flexShrink: 0, width: 120 }}>
                     <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'hsl(var(--muted))', marginBottom: '0.5rem' }}>
                         <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                     <p style={{ fontSize: '0.75rem', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</p>
                     <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>${item.price}</p>
                </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button 
               className="btn btn-primary" 
               style={{ flex: 1 }}
               onClick={() => addToCart(generatedOutfit)}
            >
               <ShoppingCart size={18} /> Add All
            </button>
            <button 
               className="btn btn-secondary"
               style={{ flex: 1 }}
               onClick={handleImagineMe}
               disabled={tryOnLoading}
            >
               <UserFocus size={18} /> {tryOnLoading ? 'Loading...' : 'Imagine On Me'}
            </button>
          </div>
        </div>
      )}

      {showImagineModal && imagineResult && (
          <ImagineMeResultModal 
             isOpen={showImagineModal}
             onClose={() => setShowImagineModal(false)}
             result={imagineResult}
          />
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      <MissingDataModal
        isOpen={showMissingDataModal}
        onClose={() => setShowMissingDataModal(false)}
      />
    </div>
  );
}
