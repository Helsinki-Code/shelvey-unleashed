import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing strategy: $8 markup on standard domains, 40% markup on premium domains
const STANDARD_MARKUP = 8.00;
const PREMIUM_MARKUP_PERCENT = 0.40;

function calculateOurPrice(registrarPrice: number, isPremium: boolean): number {
  if (isPremium) {
    return registrarPrice * (1 + PREMIUM_MARKUP_PERCENT);
  }
  return registrarPrice + STANDARD_MARKUP;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, tlds } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    if (!vercelToken) {
      return new Response(
        JSON.stringify({ error: "Domain search service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Clean the query - remove spaces and special characters
    const cleanQuery = query.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    
    // Default TLDs to check
    const tldsToCheck = tlds || ["com", "io", "co", "ai", "pro", "dev", "app", "net", "org"];
    
    const results = [];

    // Check each TLD using Vercel's domain check API
    for (const tld of tldsToCheck) {
      const domainName = `${cleanQuery}.${tld}`;
      
      try {
        // Check domain availability via Vercel
        const checkResponse = await fetch(
          `https://api.vercel.com/v4/domains/status?name=${domainName}`,
          {
            headers: {
              Authorization: `Bearer ${vercelToken}`,
            },
          }
        );

        if (checkResponse.ok) {
          const statusData = await checkResponse.json();
          
          // Get pricing info
          const priceResponse = await fetch(
            `https://api.vercel.com/v4/domains/price?name=${domainName}`,
            {
              headers: {
                Authorization: `Bearer ${vercelToken}`,
              },
            }
          );

          let registrarPrice = 12.00; // Default price
          let isPremium = false;

          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            registrarPrice = priceData.price || 12.00;
            isPremium = priceData.premium || registrarPrice > 50;
          }

          const ourPrice = calculateOurPrice(registrarPrice, isPremium);

          results.push({
            domain: domainName,
            available: statusData.available === true,
            registrar: "vercel",
            registrarPrice,
            ourPrice: Math.ceil(ourPrice * 100) / 100, // Round up to 2 decimals
            isPremium,
            tld,
          });
        }
      } catch (error) {
        console.error(`Error checking ${domainName}:`, error);
        // Continue with other domains
      }
    }

    // Sort: available first, then by price
    results.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.ourPrice - b.ourPrice;
    });

    // Add suggestions if main domain is taken
    const suggestions = [];
    const mainDomain = `${cleanQuery}.com`;
    const mainResult = results.find(r => r.domain === mainDomain);
    
    if (mainResult && !mainResult.available) {
      // Generate alternative suggestions
      const prefixes = ["get", "try", "my", "the", "go"];
      const suffixes = ["app", "hq", "now", "io", "pro"];
      
      for (const prefix of prefixes.slice(0, 2)) {
        suggestions.push(`${prefix}${cleanQuery}.com`);
      }
      for (const suffix of suffixes.slice(0, 2)) {
        suggestions.push(`${cleanQuery}${suffix}.com`);
      }
    }

    return new Response(
      JSON.stringify({ 
        results, 
        suggestions,
        query: cleanQuery,
        markup: {
          standard: `$${STANDARD_MARKUP} markup`,
          premium: `${PREMIUM_MARKUP_PERCENT * 100}% markup`
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Domain search error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
