import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORIES = [
  { c1: 'Apparel', c2: 'Topwear', c3: 'T-shirt' },
  { c1: 'Apparel', c2: 'Topwear', c3: 'Shirt' },
  { c1: 'Apparel', c2: 'Topwear', c3: 'Sweater' },
  { c1: 'Apparel', c2: 'Topwear', c3: 'Top' },
  { c1: 'Apparel', c2: 'Bottomwear', c3: 'Jeans' },
  { c1: 'Apparel', c2: 'Bottomwear', c3: 'Trousers' },
  { c1: 'Apparel', c2: 'Bottomwear', c3: 'Shorts' },
  { c1: 'Apparel', c2: 'Bottomwear', c3: 'Skirt' },
  { c1: 'Apparel', c2: 'Outerwear', c3: 'Jacket' },
  { c1: 'Apparel', c2: 'Outerwear', c3: 'Coat' },
  { c1: 'Apparel', c2: 'Dress', c3: 'Dress' },
  { c1: 'Footwear', c2: 'Shoes', c3: 'Sneakers' },
  { c1: 'Footwear', c2: 'Shoes', c3: 'Boots' },
  { c1: 'Footwear', c2: 'Shoes', c3: 'Heels' },
  { c1: 'Footwear', c2: 'Shoes', c3: 'Flats' },
  { c1: 'Accessories', c2: 'Bags', c3: 'Bag' },
  { c1: 'Accessories', c2: 'Jewelry', c3: 'Necklace' },
  { c1: 'Accessories', c2: 'Eyewear', c3: 'Sunglasses' },
];

const COLORS = [
  'Black', 'White', 'Gray', 'Navy', 'Blue', 'Red', 'Pink', 'Green', 
  'Yellow', 'Orange', 'Purple', 'Beige', 'Brown', 'Cream', 'Olive'
];

const BRANDS = ['Zara', 'H&M', 'Nike', 'Adidas', 'Uniqlo', 'Levis', 'Gucci', 'Prada', 'Vans', 'Converse', 'Puma'];

// We'll use a fixed set of realistic Unsplash fashion photos to avoid 404s/rate limits with random endpoints
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
  'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=600&q=80',
  'https://images.unsplash.com/photo-1434389678278-be4e525143a5?w=600&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&q=80',
  'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=600&q=80',
  'https://images.unsplash.com/photo-1591369822096-1d1134268e3e?w=600&q=80',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80',
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
  'https://images.unsplash.com/photo-1618932260643-efe1ed1a3b1a?w=600&q=80',
  'https://images.unsplash.com/photo-1596755094514-f87e32f8542c?w=600&q=80',
  'https://images.unsplash.com/photo-1608228064669-0a6b7264a849?w=600&q=80',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80',
  'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80',
  'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=600&q=80',
  'https://images.unsplash.com/photo-1588099768531-a72d4a198538?w=600&q=80'
];

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedProducts() {
  console.log('Seeding 200 store products...');
  
  const products = [];
  
  for (let i = 0; i < 200; i++) {
    const cat = randomElement(CATEGORIES);
    const color = randomElement(COLORS);
    const brand = randomElement(BRANDS);
    const price = Math.floor(Math.random() * 200) + 15; // Random price between 15 and 215
    const image = randomElement(SAMPLE_IMAGES);
    
    // We also set `category` because sometimes existing code relies on it vs category3
    // E.g., `Shirt`, `Jeans`, `Sneakers`
    const product = {
      title: `${brand} ${color} ${cat.c3}`,
      description: `A stylish ${color.toLowerCase()} ${cat.c3.toLowerCase()} by ${brand}. Perfect for any occasion.`,
      price: price,
      image_url: image, // Use our preset reliable images instead of random unreliable endpoints
      category: cat.c3,
      category1: cat.c1,
      category2: cat.c2,
      category3: cat.c3,
      color: color,
      brand: brand
    };
    
    products.push(product);
  }

  // Insert in batches of 50 to avoid any limits
  for (let i = 0; i < products.length; i += 50) {
    const batch = products.slice(i, i + 50);
    const { error } = await supabase.from('store_products').insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / 50 + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / 50 + 1} (${batch.length} items)`);
    }
  }
  
  console.log('Finished seeding.');
}

seedProducts();
