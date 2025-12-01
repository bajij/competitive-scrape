// changesApiRoute / routeApiChangements : historique des changements d'une page surveillée
// Changes API route: history of changes for a monitored page

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

// GET /api/monitored-pages/[pageId]/changes
// listChanges / listerChangements : renvoie les changements récents d'une page surveillée
// Returns recent changes for a monitored page
export async function GET(_request: Request, context: RouteContext) {
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
    // ensurePageExists / verifierPageExiste : s'assurer que la page existe
    // Ensure the monitored page exists
    const page = await prisma.monitoredPage.findUnique({
      where: { id: monitoredPageId },
      select: { id: true },
    });

    if (!page) {
      return NextResponse.json(
        {
          message:
            'Page surveillée introuvable. / Monitored page not found.',
        },
        { status: 404 },
      );
    }

    const changes = await prisma.change.findMany({
      where: { monitoredPageId },
      orderBy: { createdAt: 'desc' },
      take: 20, // limitResults / limiterResultats : derniers changements
    });

    return NextResponse.json(changes, { status: 200 });
  } catch (error) {
    console.error('changesGetError / erreurGetChangements', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors de la récupération des changements. / Error fetching changes.',
      },
      { status: 500 },
    );
  }
}
