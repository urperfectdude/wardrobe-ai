import { useState, useRef } from 'react';
import { UploadSimple, Funnel, ShoppingCart, UserFocus } from '@phosphor-icons/react';
import { analyzeClothingImage } from '../utils/openaiAnalysis';
import { imageToBase64, compressImage } from '../utils/storage';
import { generateTryOn } from '../utils/generateTryOn';
import { useAuth } from '../contexts/AuthContext';
import ImagineMeResultModal from './ImagineMeResultModal';
import MissingDataModal from './MissingDataModal';
import AuthModal from './AuthModal';

export default function StoreItemSuggestor({ products, addToCart }) {
  const { userProfile, user, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [status, setStatus] = useState(''); // 'uploading', 'analyzing', 'matching'
  const [suggestedOutfit, setSuggestedOutfit] = useState(null);
  
  const [showImagineModal, setShowImagineModal] = useState(false);
  const [imagineResult, setImagineResult] = useState(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus('Processing image...');
      const base64 = await imageToBase64(file);
      const compressed = await compressImage(base64, 600);
      setUploadedImage(compressed);

      setStatus('Analyzing item style...');
      const result = await analyzeClothingImage(compressed);
      setAnalysisResult(result);

      setStatus('Finding store matches...');
      // Logic: If user uploads a top, suggest a bottom and shoes from the store.
      // If user uploads a bottom, suggest a top and shoes.
      
      const categoryType = result.category1 || 'Topwear';
      let requiredCategories = [];
      
      if (categoryType === 'Topwear' || result.category3 === 'Shirt' || result.category3 === 'T-shirt') {
          // Need Bottoms and Shoes
          requiredCategories = ['Bottomwear', 'Footwear'];
      } else if (categoryType === 'Bottomwear' || result.category3 === 'Jeans' || result.category3 === 'Trousers') {
          // Need Tops and Shoes
          requiredCategories = ['Topwear', 'Footwear'];
      } else {
          // Fallback: just suggest random accessories or shoes
          requiredCategories = ['Accessories', 'Footwear'];
      }

      // Mock DB Query: Filter local `products` state for matching types
      // In a real scenario, this would be a specialized vector search or SQL query based on the item description/color
      setTimeout(() => {
          const suggestions = [];
          
          requiredCategories.forEach(reqCat => {
              const matches = products.filter(p => p.category1 === reqCat);
              if (matches.length > 0) {
                 const randomMatch = matches[Math.floor(Math.random() * matches.length)];
                 suggestions.push(randomMatch);
              }
          });

          setSuggestedOutfit(suggestions);
          setStatus('');
      }, 1500);

    } catch (e) {
      console.error(e);
      alert('Failed to process image: ' + e.message);
      setStatus('');
    }
  };

  const handleImagineMe = async () => {
    if (!user) {
        setShowAuthModal(true);
        return;
    }

    if (!suggestedOutfit || suggestedOutfit.length === 0 || !uploadedImage) return;
    
    setTryOnLoading(true);
    try {
      const freshProfile = await refreshProfile() || userProfile;
      const isProfileComplete = (freshProfile?.profile_picture || freshProfile?.selfie_url) && freshProfile?.body_type && freshProfile?.skin_color;
      
      if (!isProfileComplete) {
          setTryOnLoading(false);
          setShowMissingDataModal(true);
          return;
      }

      const itemsToTryOn = [
          // the uploaded item
          { id: 'user-uploaded', image: uploadedImage, title: analysisResult?.title || 'Your Item', category: analysisResult?.category3 || 'Top' },
          // the store items
          ...suggestedOutfit.map(item => ({
              id: item.id,
              image: item.image_url,
              title: item.title,
              category: item.category3 || item.category
          }))
      ];

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
        itemsToTryOn,
        freshProfile?.profile_picture || freshProfile?.selfie_url
      );
      
      setImagineResult({
          imagine_on_avatar: tryOnImageUrl,
          items: itemsToTryOn,
          description: "Virtual Try-On with your uploaded item and store suggestions"
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
            width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', 
            color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' 
         }}>
           <Funnel size={32} weight="fill" />
         </div>
         <h2 style={{ marginBottom: '0.5rem' }}>Match My Item</h2>
         <p className="text-muted">Upload an item from your closet and we'll suggest perfect pairings from our store.</p>
      </div>

      {!uploadedImage && (
        <div 
          className="dropzone" 
          onClick={() => {
              if (!user) { alert('Please log in first to use this feature.'); return; }
              fileInputRef.current?.click();
          }}
          style={{ marginBottom: '2rem' }}
        >
          <UploadSimple className="dropzone-icon" />
          <div className="dropzone-text">
            <h4>Tap to Upload Item</h4>
            <p>JPEG, PNG up to 5MB</p>
          </div>
          <input 
             type="file" 
             ref={fileInputRef} 
             accept="image/*" 
             onChange={handleFileSelect} 
             style={{ display: 'none' }}
          />
        </div>
      )}

      {status && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontWeight: 500 }}>{status}</p>
          </div>
      )}

      {uploadedImage && !status && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             
             {/* Uploaded Item View */}
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'hsl(var(--secondary))', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                 <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                     <img src={uploadedImage} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 </div>
                 <div>
                     <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Your Item</p>
                     <h4 style={{ margin: '0 0 0.25rem' }}>{analysisResult?.title || 'Analyzed Item'}</h4>
                     <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{analysisResult?.color} • {analysisResult?.category3}</p>
                 </div>
                 <button 
                    className="btn btn-outline btn-sm" 
                    style={{ marginLeft: 'auto' }}
                    onClick={() => { setUploadedImage(null); setSuggestedOutfit(null); }}
                  >
                    Change
                 </button>
             </div>

             {/* Store Suggestions */}
             {suggestedOutfit && suggestedOutfit.length > 0 && (
                 <div>
                     <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Suggested Pairings for You</h3>
                     
                     <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' }}>
                        {suggestedOutfit.map(item => (
                            <div key={item.id} style={{ flexShrink: 0, width: 140 }}>
                                <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'hsl(var(--muted))', marginBottom: '0.5rem', position: 'relative' }}>
                                    <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'hsl(var(--primary))', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                                        STORE
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</p>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>${item.price}</p>
                                <button 
                                    className="btn btn-outline btn-sm" 
                                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.25rem', minHeight: 32 }}
                                    onClick={() => addToCart(item)}
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                     </div>

                     <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button 
                        className="btn btn-primary" 
                        style={{ flex: 1 }}
                        onClick={() => addToCart(suggestedOutfit)}
                        >
                        <ShoppingCart size={18} /> Add All
                        </button>
                        <button 
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={handleImagineMe}
                        disabled={tryOnLoading}
                        >
                        <UserFocus size={18} /> {tryOnLoading ? 'Loading...' : 'Imagine Setup'}
                        </button>
                    </div>
                 </div>
             )}
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
