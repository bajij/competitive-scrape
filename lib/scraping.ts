// scrapingUtils / utilitairesScraping : fonctions de base pour récupérer et nettoyer le HTML
// Basic scraping utilities: fetch and clean HTML

// PricingItem / elementTarifaire : structure pour un produit ou plan tarifaire détecté
// Structured data for a product / pricing item detected on the page
export type PricingItem = {
  sku: string;              // identifiant produit / product identifier (ex: "ST-HEAD-X100")
  name: string;             // nom du produit / product name
  price: number;            // prix en valeur numérique / numeric price (ex: 79.9)
  currency: string;         // devise (ex: "EUR")
  availability?: string;    // disponibilité (ex: "En stock", "En promotion")
};

// ScrapeResult / resultatScraping : résultat complet du scraping d'une page
// Full scraping result for a page
export type ScrapeResult = {
  rawHtml: string;          // rawHtml / htmlBrut : HTML complet récupéré
  extractedText: string;    // extractedText / texteExtrait : texte nettoyé
  pricingData: PricingItem[]; // pricingData / donneesTarifaires : produits/plans détectés
};

// cleanHtmlToText / nettoyerHtmlEnTexte : transforme du HTML brut en texte lisible
// Converts raw HTML into readable text
function cleanHtmlToText(rawHtml: string): string {
  let output = rawHtml;

  // removeScriptTags / retirerBalisesScript : on enlève scripts et styles pour ne garder que le contenu
  // Remove script and style tags to keep only main content
  output = output.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  output = output.replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // blockTagsToNewlines / balisesBlocEnSautsDeLigne : certains tags créent des "blocs" → nouvelle ligne
  // Some tags represent blocks → convert them to newlines
  output = output.replace(
    /<\/(p|div|h[1-6]|li|section|article|header|footer|tr|br)>/gi,
    '\n',
  );

  // removeAllTags / retirerToutesBalises : suppression des balises restantes
  // Strip all remaining HTML tags
  output = output.replace(/<[^>]+>/g, ' ');

  // normalizeNewlines / normaliserSautsLigne
  // Normalize newline characters
  output = output.replace(/\r/g, '');
  output = output.replace(/\n{3,}/g, '\n\n');

  // normalizeSpaces / normaliserEspaces
  // Normalize spaces and tabs
  output = output.replace(/[ \t]+/g, ' ');

  // trimEdges / supprimerBords
  // Trim leading and trailing whitespace
  output = output.trim();

  // limitLength / limiterLongueur : évite de stocker des textes gigantesques
  // Avoid storing extremely large texts
  const maxLength = 15000;
  if (output.length > maxLength) {
    output = output.slice(0, maxLength);
  }

  return output;
}

// parsePriceFromString / parserPrixDepuisChaine : convertit "79,90 €" ou "79.90" en 79.9
// Converts "79,90 €" or "79.90" to 79.9
function parsePriceFromString(raw: string): number | null {
  // retire les espaces et la monnaie / strip spaces & currency symbols
  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/[^\d.,]/g, '') // garde seulement chiffres, . et ,
    .replace(',', '.');

  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

// extractPricingFromHtml / extraireTarifsDepuisHtml : détecte les produits/prix structurés
// Detects structured products/pricing from HTML
function extractPricingFromHtml(rawHtml: string): PricingItem[] {
  const items: PricingItem[] = [];

  // On cible les blocs <article ... data-sku="..."> ... </article>
  // We target <article ... data-sku="..."> ... </article> blocks
  const articleRegex =
    /<article\b[^>]*data-sku="([^"]+)"[^>]*>([\s\S]*?)<\/article>/gi;

  let articleMatch: RegExpExecArray | null;

  while ((articleMatch = articleRegex.exec(rawHtml)) !== null) {
    const sku = articleMatch[1];
    const articleHtml = articleMatch[2];

    // productName / nomProduit
    const nameMatch =
      /class="[^"]*product-name[^"]*"[^>]*>([^<]+)<\/h[1-6]>/i.exec(
        articleHtml,
      );

    // productPrice / prixProduit : priorité à data-price, sinon texte
    const priceDataMatch =
      /class="[^"]*product-price[^"]*"[^>]*data-price="([^"]+)"/i.exec(
        articleHtml,
      );
    const priceTextMatch =
      /class="[^"]*product-price[^"]*"[^>]*>([^<]+)<\/p>/i.exec(
        articleHtml,
      );

    // productAvailability / disponibiliteProduit
    const availabilityMatch =
      /class="[^"]*product-availability[^"]*"[^>]*>([^<]+)<\/p>/i.exec(
        articleHtml,
      );

    if (!nameMatch || (!priceDataMatch && !priceTextMatch)) {
      // si on n'a ni nom ni prix, on ignore ce bloc
      // if we don't have name and price, skip this block
      continue;
    }

    const name = nameMatch[1].trim();

    const rawPrice =
      (priceDataMatch && priceDataMatch[1]) ||
      (priceTextMatch && priceTextMatch[1]) ||
      '';

    const price = parsePriceFromString(rawPrice);
    if (price === null) {
      continue;
    }

    const availability = availabilityMatch
      ? availabilityMatch[1].trim()
      : undefined;

    items.push({
      sku,
      name,
      price,
      currency: 'EUR',
      availability,
    });
  }

  return items;
}

// scrapePage / scraperPage : récupère la page et applique le nettoyage + extraction pricing
// Fetches a page and applies cleaning + pricing extraction
export async function scrapePage(url: string): Promise<ScrapeResult> {
  // basicFetch / recuperationBasique : on utilise fetch côté serveur
  // Use server-side fetch
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      // userAgent / agentUtilisateur : simple UA pour le dev (à personnaliser en prod)
      // Simple user agent for dev (should be customized in production)
      'User-Agent':
        'CompetitiveWatchBot/0.1 (dev; contact: change-me@example.com)',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store', // noCache / pasDeCache : on veut du contenu frais
  });

  if (!response.ok) {
    throw new Error(
      `Impossible de récupérer la page (${response.status}). / Failed to fetch page (${response.status}).`,
    );
  }

  const rawHtml = await response.text();
  const extractedText = cleanHtmlToText(rawHtml);
  const pricingData = extractPricingFromHtml(rawHtml);

  return {
    rawHtml,
    extractedText,
    pricingData,
  };
}
