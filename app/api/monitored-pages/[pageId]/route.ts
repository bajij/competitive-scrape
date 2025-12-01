// monitoredPageApiRoute / routeApiPageSurveillee : gestion d'une page surveillée
// API route for a monitored page: delete with cascades

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// RouteContext / contexteRoute : params est un Promise (Next 16)
// Route context: params is a Promise (Next 16)
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

// DELETE /api/monitored-pages/[pageId]
// deleteMonitoredPage / supprimerPageSurveillee : supprime page + snapshots + changements
// Delete monitored page + snapshots + changes
export async function DELETE(_request: Request, context: RouteContext) {
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

    // transactionCascade / transactionCascade : suppression en cascade dans l'ordre
    // Cascade delete in the right order
    await prisma.$transaction([
      prisma.change.deleteMany({
        where: { monitoredPageId },
      }),
      prisma.snapshot.deleteMany({
        where: { monitoredPageId },
      }),
      prisma.monitoredPage.delete({
        where: { id: monitoredPageId },
      }),
    ]);

    return NextResponse.json(
      {
        message:
          'Page surveillée supprimée avec succès. / Monitored page deleted successfully.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('deleteMonitoredPageError / erreurSuppressionPageSurveillee', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors de la suppression de la page surveillée. / Error deleting monitored page.',
      },
      { status: 500 },
    );
  }
}
