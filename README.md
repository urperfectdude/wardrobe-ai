# 👗 Wardrobe AI - Your Smart Digital Stylist

Wardrobe AI is an intelligent fashion companion that helps you organize your closet, discover new styles, and solve the daily "what should I wear?" dilemma through the power of AI and sustainable shopping.

![Wardrobe AI Banner](/public/moods/party.png) *Note: Replace with actual app screenshot*

## 🚀 Problem Statement

In today's fast-paced world, fashion consumers face three critical problems:
1.  **Decision Fatigue**: The average person spends significantly time just deciding what to wear, often feeling they have "nothing to wear" despite a full closet.
2.  **Closet Chaos**: Wardrobes are often disorganized, leading to forgotten items and duplicate purchases.
3.  **Sustainability Gap**: Finding thrifted or pre-loved fashion that matches personal style is difficult and fragmented across multiple platforms.

## 💡 The Solution

**Wardrobe AI** bridges the gap between your physical closet and the digital world. By digitizing your wardrobe and understanding your personal style DNA, it acts as a personal stylist that works 24/7.

It doesn't just manage clothes; it **creates outfits**, **mixes** your items with shoppable products, and **promotes circular fashion** by making it easy to buy and sell pre-loved items within the same ecosystem.

## 🏗️ Architecture & Tech Stack

Wardrobe AI is built as a modern Single Page Application (SPA) leveraging the power of Supabase for a robust Backend-as-a-Service (BaaS) infrastructure.

### Frontend
-   **Framework**: React (Vite) for high-performance UI.
-   **Styling**: Vanilla CSS + Utility Tokens (HSL colors, variables) for a bespoke, premium design system.
-   **Animations**: `framer-motion` for fluid, native-like transitions and interactions.
-   **Icons**: `lucide-react`.

### Backend & Infrastructure (Supabase)
-   **Database**: PostgreSQL for relational data (items, products, outfits, profiles).
-   **Authentication**: Secure user management.
-   **Storage**: Hosting for user-uploaded wardrobe images and assets.
-   **Real-time**: (Future capability) For instant offer notifications.

### AI Integration
-   **Styling Engine**: Algorithms to match items based on category, color theory, and occasion context.
-   **Generative Analysis**: Integration with OpenAI (planned/active) to generate "Why this outfit works" explanations.

## ✨ Key Features

### 1. 👚 Digital Closet Management
-   **Upload & Organize**: Snap photos of your clothes. The app categorizes them (Top, Bottom, Footwear, etc.).
-   **Visual Inventory**: Browse your entire wardrobe from your phone.

### 2. ✨ AI Outfit Generation
-   **Mood-Based Styling**: Select from moods like *Party, Office, Casual, Date Night, Wedding, Vacation*.
-   **Context Aware**: The AI selects items appropriate for the occasion.
-   **Smart Mixing**:
    -   **Closet Mode**: Styles only what you own.
    -   **Shop Mode**: Suggests complete look from store.
    -   **Hybrid Mode**: Mixes your clothes with new shopping recommendations to "complete the look".

### 3. 🛍️ Smart Shop & Thrift Discovery
-   **Aggregated Marketplace**: Browse items from platforms like Myntra, Ajio, Amazon, and curated thrift stores.
-   **Advanced Filtering**: Filter by Verified Thrift vs. New, Brand, Color, Material, and Price.
-   **Sustainable Focus**: Highlighted "Pre-loved" badge and thrift integration to encourage sustainable choices.

### 4. 🧬 Personalization (Style DNA)
-   **Style Profile**: Set preferences for Body Type, Favorite Colors, Styles to Avoid, and Budget.
-   **Adaptive Learning**: The app learns from what you save and create.

### 5. 🌏 Community & Social
-   **Public Feed**: Share your generated outfits with the community.
-   **Inspiration**: Browse "Recent Public Outfits" on the home page to see how others are styling items.
-   **Save to Favorites**: Build your personal lookbook.

### 6. 🤝 Peer-to-Peer Commerce
-   **Make an Offer**: See an item in a community outfit that's from a user's closet? Make an offer directly to buy it.
-   **Qilin Integration**: Seamless resell flows.

## 📱 Getting Started

### Prerequisites
-   Node.js (v16+)
-   Supabase Account (for backend connection)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/wardrobe-ai.git
    cd wardrobe-ai
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up Environment Variables:
    Create a `.env` file and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

## 🔮 Future Roadmap
-   [ ] **Virtual Try-On**: Using Generative AI to visualize clothes on your avatar.
-   [ ] **Weather Integration**: Suggest outfits based on real-time weather forecast.
-   [ ] **Calendar Sync**: "What to wear" suggestions for your scheduled meetings/events.

---

*Crafted with ❤️ for the future of Fashion.*
