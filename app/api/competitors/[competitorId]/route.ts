// competitorApiRoute / routeApiConcurrent : mise à jour et suppression d'un concurrent
// Competitor API route: update and delete a competitor

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, type CompetitorStatus } from '@prisma/client';

// RouteContext / contexteRoute : params est un Promise (Next 16)
// Route context: params is a Promise (Next 16)
type RouteContext = {
  params: Promise<{
    competitorId: string;
  }>;
};

// parseCompetitorId / parserIdConcurrent : convertit et valide l'id
// Converts and validates competitor id
function parseCompetitorId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

// validateStatus / validerStatut : vérifie que le statut est autorisé
// Validates that the status is allowed
function validateStatus(
  status: string | undefined,
): CompetitorStatus | undefined {
  if (!status) return undefined;

  const allowed: CompetitorStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED'];
  return allowed.includes(status as CompetitorStatus)
    ? (status as CompetitorStatus)
    : undefined;
}

// GET /api/competitors/[competitorId]
// getCompetitor / recupererConcurrent : renvoie un concurrent avec ses infos principales
// Returns a competitor with basic related info
export async function GET(_request: Request, context: RouteContext) {
  const { competitorId: rawId } = await context.params;
  const competitorId = parseCompetitorId(rawId);

  if (!competitorId) {
    return NextResponse.json(
      {
        message:
          'Paramètre competitorId invalide. / Invalid competitorId parameter.',
      },
      { status: 400 },
    );
  }

  try {
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        project: true,
        monitoredPages: true,
      },
    });

    if (!competitor) {
      return NextResponse.json(
        {
          message:
            'Concurrent introuvable. / Competitor not found.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(competitor, { status: 200 });
  } catch (error) {
    console.error('getCompetitorError / erreurGetConcurrent', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors du chargement du concurrent. / Error loading competitor.',
      },
      { status: 500 },
    );
  }
}

// PATCH /api/competitors/[competitorId]
// updateCompetitor / mettreAJourConcurrent : met à jour nom/site/description/tags/statut
// Update competitor name/website/description/tags/status
export async function PATCH(request: Request, context: RouteContext) {
  const { competitorId: rawId } = await context.params;
  const competitorId = parseCompetitorId(rawId);

  if (!competitorId) {
    return NextResponse.json(
      {
        message:
          'Paramètre competitorId invalide. / Invalid competitorId parameter.',
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        websiteUrl?: string | null;
        description?: string | null;
        tags?: string | null;
        status?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json(
      {
        message:
          'Corps de requête invalide. / Invalid request body.',
      },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json(
        {
          message:
            'Le nom du concurrent ne peut pas être vide. / Competitor name cannot be empty.',
        },
        { status: 400 },
      );
    }
    data.name = trimmed;
  }

  if (body.websiteUrl !== undefined) {
    const trimmed =
      typeof body.websiteUrl === 'string'
        ? body.websiteUrl.trim()
        : '';
    data.websiteUrl = trimmed || null;
  }

  if (body.description !== undefined) {
    const trimmed =
      typeof body.description === 'string'
        ? body.description.trim()
        : '';
    data.description = trimmed || null;
  }

  if (body.tags !== undefined) {
    const trimmed =
      typeof body.tags === 'string' ? body.tags.trim() : '';
    data.tags = trimmed || null;
  }

  const validatedStatus = validateStatus(body.status);
  if (body.status && !validatedStatus) {
    return NextResponse.json(
      {
        message:
          'Statut invalide. Utilisez ACTIVE, PAUSED ou ARCHIVED. / Invalid status. Use ACTIVE, PAUSED or ARCHIVED.',
      },
      { status: 400 },
    );
  }

  if (validatedStatus) {
    data.status = validatedStatus;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      {
        message:
          'Aucun champ valide à mettre à jour. / No valid fields to update.',
      },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.competitor.update({
      where: { id: competitorId },
      data,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('updateCompetitorError / erreurMiseAJourConcurrent', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        {
          message:
            'Concurrent introuvable. / Competitor not found.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message:
          'Erreur lors de la mise à jour du concurrent. / Error updating competitor.',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/competitors/[competitorId]
// deleteCompetitor / supprimerConcurrent : supprime le concurrent et ses données
// Delete competitor and all related data (pages, snapshots, changes)
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const { competitorId: rawId } = await context.params;
  const competitorId = parseCompetitorId(rawId);

  if (!competitorId) {
    return NextResponse.json(
      {
        message:
          'Paramètre competitorId invalide. / Invalid competitorId parameter.',
      },
      { status: 400 },
    );
  }

  try {
    const deleted = await prisma.competitor.delete({
      where: { id: competitorId },
    });

    return NextResponse.json(
      {
        message:
          'Concurrent et données associées supprimés avec succès. / Competitor and related data deleted successfully.',
        deletedId: deleted.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('deleteCompetitorError / erreurSuppressionConcurrent', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      // Suppression idempotente : si le concurrent n'existe plus, on considère l'état comme sync.
// Idempotent delete: if competitor no longer exists, state is considered synced.
      return NextResponse.json(
        {
          message:
            'Concurrent déjà supprimé ou introuvable. État synchronisé. / Competitor already deleted or not found. State is now synced.',
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        message:
          'Erreur lors de la suppression du concurrent. / Error deleting competitor.',
      },
      { status: 500 },
    );
  }
}
