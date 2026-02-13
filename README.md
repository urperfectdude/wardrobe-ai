
# Wardrobe AI

... (existing content) ...

## Product Search Feature

This project uses the **Real-Time Product Search API** (via RapidAPI) to find buyable items matching user outfits.

### Configuration

You must set the following environment variables in your Supabase Edge Functions:

- `RAPIDAPI_KEY`: Your key from RapidAPI.
- `OPENAI_API_KEY`: For generating optimized search queries.

### API Usage

The backend function `search-products` accepts:
- `query`: The base search term (e.g. "red dress").
- `filters`: Optional object with `limit`, `sortBy`, `condition`.

It returns:
- `optimizedQuery`: The refined search term used.
- `products`: Array of found items with images and links.
