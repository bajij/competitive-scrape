// monitoredPagesApiRoute / routeApiPagesSurveillees : gestion des pages d'un concurrent
// API route for monitored pages: manage pages for a given competitor

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// allowedPageTypes / typesPageAutorises : les types fonctionnels de page possibles
// Allowed functional page types
const ALLOWED_PAGE_TYPES = ['PRICING', 'LANDING', 'PRODUCT', 'BLOG', 'OTHER'] as const;
type PageTypeLiteral = (typeof ALLOWED_PAGE_TYPES)[number];

// RouteContext / contexteRoute : "params" est un Promise en Next 16
// Route context: "params" is a Promise in Next 16
type RouteContext = {
  params: Promise<{
    competitorId: string;
  }>;
};

// parseCompetitorId / parserIdConcurrent : convertit l'id en nombre et le valide
// Converts competitorId into a number and validates it
function parseCompetitorId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

// GET /api/competitors/[competitorId]/pages
// listMonitoredPages / listerPagesSurveillees : renvoie les pages d'un concurrent
// Returns monitored pages for a competitor
export async function GET(_request: Request, context: RouteContext) {
  const { competitorId: competitorIdRaw } = await context.params;
  const competitorId = parseCompetitorId(competitorIdRaw);

  if (!competitorId) {
    return NextResponse.json(
      { message: 'Paramètre competitorId invalide. / Invalid competitorId parameter.' },
      { status: 400 },
    );
  }

  try {
    // ensureCompetitorExists / verifierConcurrentExiste
    // Ensure competitor exists
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      select: { id: true },
    });

    if (!competitor) {
      return NextResponse.json(
        { message: 'Concurrent introuvable. / Competitor not found.' },
        { status: 404 },
      );
    }

    const pages = await prisma.monitoredPage.findMany({
      where: { competitorId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pages, { status: 200 });
  } catch (error) {
    console.error('monitoredPagesGetError / erreurGetPagesSurveillees', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors de la récupération des pages surveillées. / Error fetching monitored pages.',
      },
      { status: 500 },
    );
  }
}

// POST /api/competitors/[competitorId]/pages
// createMonitoredPage / creerPageSurveillee : ajoute une URL surveillée
// Creates a monitored page for a competitor
export async function POST(request: Request, context: RouteContext) {
  const { competitorId: competitorIdRaw } = await context.params;
  const competitorId = parseCompetitorId(competitorIdRaw);

  if (!competitorId) {
    return NextResponse.json(
      { message: 'Paramètre competitorId invalide. / Invalid competitorId parameter.' },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          url?: unknown;
          pageType?: unknown;
          note?: unknown;
        }
      | null;

    if (!body || typeof body.url !== 'string' || body.url.trim().length === 0) {
      return NextResponse.json(
        {
          message:
            'Le champ "url" est requis pour la page surveillée. / "url" field is required for monitored page.',
        },
        { status: 400 },
      );
    }

    const url = body.url.trim();

    // validatePageType / validerTypePage : par défaut OTHER si rien n'est fourni
    // Default page type is OTHER if not provided
    let pageType: PageTypeLiteral = 'OTHER';

    if (typeof body.pageType === 'string' && body.pageType.trim().length > 0) {
      const upper = body.pageType.trim().toUpperCase();
      if (ALLOWED_PAGE_TYPES.includes(upper as PageTypeLiteral)) {
        pageType = upper as PageTypeLiteral;
      } else {
        return NextResponse.json(
          {
            message:
              'Type de page invalide. Valeurs possibles: PRICING, LANDING, PRODUCT, BLOG, OTHER. / Invalid page type.',
          },
          { status: 400 },
        );
      }
    }

    const note =
      typeof body.note === 'string' && body.note.trim().length > 0
        ? body.note.trim()
        : undefined;

    // ensureCompetitorExists / verifierConcurrentExiste encore une fois
    // Double check competitor existence
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      select: { id: true },
    });

    if (!competitor) {
      return NextResponse.json(
        { message: 'Concurrent introuvable. / Competitor not found.' },
        { status: 404 },
      );
    }

    const page = await prisma.monitoredPage.create({
      data: {
        competitorId,
        url,
        pageType,
        note,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('monitoredPagesPostError / erreurPostPagesSurveillees', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors de la création de la page surveillée. / Error creating monitored page.',
      },
      { status: 500 },
    );
  }
}
