// snapshotApiRoute / routeApiSnapshot : création de snapshot et détection de changement
// Snapshot API route: create snapshot and detect changes

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { scrapePage } from '@/lib/scraping';
import { ChangeType } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// PricingItemType / typeElementTarif : élément de pricing détecté dans le texte
// Pricing item type: detected pricing element in the text
type PricingItem = {
  label: string | null;   // court libellé de la ligne / short label from the line
  amount: number | null;  // montant numérique / numeric amount
  currency: string | null; // devise normalisée (EUR, USD, …) / normalized currency
  rawLine: string;         // ligne brute / raw text line
};

// extractPricingFromText / extraireTarifsDepuisTexte :
// Heuristique simple pour détecter des lignes contenant des prix dans le texte extrait.
// Simple heuristic to detect lines containing prices in the extracted text.
function extractPricingFromText(
  text: string | null | undefined,
): PricingItem[] {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: PricingItem[] = [];

  // priceRegex / regexPrix : cherche "49 €", "49€", "49 EUR", "$49", "49$"…
  // Looks for "49 €", "49€", "49 EUR", "$49", "49$", etc.
  const priceRegex =
    /(?:(\d+[.,]?\d*)\s*(€|eur|euro|\$|usd)|(\$)\s*(\d+[.,]?\d*))/i;

  const MAX_ITEMS = 50;

  for (const line of lines) {
    if (items.length >= MAX_ITEMS) break;

    const match = line.match(priceRegex);
    if (!match) continue;

    let amountStr: string | undefined;
    let currency: string | null = null;

    if (match[1] && match[2]) {
      // Forme "49 €" ou "49 EUR"
      // "49 €" or "49 EUR" form
      amountStr = match[1];
      const cur = match[2].toUpperCase();
      if (cur === '€' || cur === 'EURO' || cur === 'EUR') {
        currency = 'EUR';
      } else if (cur === '$' || cur === 'USD') {
        currency = 'USD';
      } else {
        currency = cur;
      }
    } else if (match[3] && match[4]) {
      // Forme "$49"
      // "$49" form
      amountStr = match[4];
      currency = 'USD';
    }

    if (!amountStr) continue;

    const normalized = amountStr.replace(',', '.');
    const amount = Number(normalized);
    if (!Number.isFinite(amount)) continue;

    items.push({
      label: line.slice(0, 120),
      amount,
      currency,
      rawLine: line,
    });
  }

  return items;
}

// RouteContext / contexteRoute : params est un Promise en Next 16
// Route context: params is a Promise in Next 16
type RouteContext = {
  params: Promise<{
    pageId: string;
  }>;
};

// parsePageId / parserIdPage : convertit et valide l'id
// Converts and validates the page id
function parsePageId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

// POST /api/monitored-pages/[pageId]/scrape
// runScrape / lancerScraping : crée un snapshot + éventuel changement
// Creates a snapshot and an optional change record
export async function POST(_request: Request, context: RouteContext) {
  const { pageId: rawPageId } = await context.params;
  const monitoredPageId = parsePageId(rawPageId);

  if (!monitoredPageId) {
    return NextResponse.json(
      {
        message:
          'Paramètre pageId invalide. / Invalid pageId parameter.',
      },
      { status: 400 },
    );
  }

  try {
    // fetchPageRecord / recupererEnregistrementPage : assure qu'elle existe
    // Ensure monitored page exists
    const monitoredPage = await prisma.monitoredPage.findUnique({
      where: { id: monitoredPageId },
      select: {
        id: true,
        url: true,
      },
    });

    if (!monitoredPage) {
      return NextResponse.json(
        { message: 'Page surveillée introuvable. / Monitored page not found.' },
        { status: 404 },
      );
    }

    // previousSnapshot / snapshotPrecedent : dernier snapshot connu pour cette page
    // Last known snapshot for this page
    const previousSnapshot = await prisma.snapshot.findFirst({
      where: { monitoredPageId },
      orderBy: { capturedAt: 'desc' },
    });

    // scrapeRemotePage / scraperPageDistante
    // Scrape the remote page
    const { rawHtml, extractedText } = await scrapePage(
      monitoredPage.url,
    );

    // pricingExtraction / extractionTarifs : heuristique sur le texte extrait
    // Pricing extraction: heuristic on the extracted text
    const pricingData = extractPricingFromText(extractedText ?? '');

    // createNewSnapshot / creerNouveauSnapshot
    // Create new snapshot
    const newSnapshot = await prisma.snapshot.create({
      data: {
        monitoredPageId,
        rawHtml,
        extractedText,
        capturedAt: new Date(),
        extractedPricing:
          pricingData.length > 0
            ? (pricingData as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });



    let change: any = null;
    let hasChange = false;

    // compareSnapshots / comparerSnapshots : on regarde si le texte a changé
    // Compare snapshots: check whether text has changed
    if (previousSnapshot) {
      const oldText = previousSnapshot.extractedText ?? '';
      const newText = extractedText ?? '';
      const oldLen = oldText.length;
      const newLen = newText.length;

      const lengthDelta = Math.abs(newLen - oldLen);
      const contentChanged = oldText !== newText;

      // threshold / seuil : on évite de créer un changement pour une micro variation
      // Avoid creating changes for tiny variations
      const MIN_LENGTH_DELTA = 20;
      const maxStoredLength = 2000;

      // --- TEXT change detection / détection changements TEXTE ---
      if (contentChanged && (lengthDelta > MIN_LENGTH_DELTA || newLen === 0)) {
        hasChange = true;

        const textChange = await prisma.change.create({
          data: {
            monitoredPageId,
            oldSnapshotId: previousSnapshot.id,
            newSnapshotId: newSnapshot.id,
            changeType: ChangeType.TEXT,
            field: 'content', // fieldName / nomChamp : contenu global
            oldValue: oldText.slice(0, maxStoredLength),
            newValue: newText.slice(0, maxStoredLength),
            changeSummary: `Contenu texte modifié (longueur ${oldLen} → ${newLen}). / Text content changed (length ${oldLen} → ${newLen}).`,
          },
        });

        // on retourne au client le premier changement créé
        // we return the first created change to the client
        change = textChange;
      }

      // --- PRICE change detection / détection changements de PRIX ---
      const oldPricing = (previousSnapshot.extractedPricing ??
        null) as unknown;
      const newPricing = (newSnapshot.extractedPricing ??
        null) as unknown;

      const pricingChanged =
        JSON.stringify(oldPricing) !== JSON.stringify(newPricing);

      if (pricingChanged && (oldPricing || newPricing)) {
        hasChange = true;

        const oldPricingStr = JSON.stringify(oldPricing).slice(
          0,
          maxStoredLength,
        );
        const newPricingStr = JSON.stringify(newPricing).slice(
          0,
          maxStoredLength,
        );

        const priceChange = await prisma.change.create({
          data: {
            monitoredPageId,
            oldSnapshotId: previousSnapshot.id,
            newSnapshotId: newSnapshot.id,
            changeType: ChangeType.PRICE,
            field: 'pricing',
            oldValue: oldPricingStr,
            newValue: newPricingStr,
            changeSummary:
              'Tarifs ou plans modifiés sur cette page. / Pricing or plans changed on this page.',
          },
        });

        // si aucun changement n’a encore été renvoyé, on renvoie celui-ci
        // if no change has been attached yet, use this one for the response
        if (!change) {
          change = priceChange;
        }
      }
    }

    return NextResponse.json(
      {
        snapshot: newSnapshot,
        change,
        hasChange,
        message: hasChange
          ? 'Changement détecté sur la page. / Change detected on the page.'
          : 'Snapshot créé, aucun changement majeur détecté. / Snapshot created, no major change detected.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('runScrapeError / erreurExecutionScraping', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors du snapshot de la page surveillée. / Error running snapshot for monitored page.',
      },
      { status: 500 },
    );
  }
}
