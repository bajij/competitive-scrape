// projectCompetitorsApiRoute / routeApiConcurrentsProjet :
// gestion des concurrents pour un projet donné.
// API route to manage competitors for a given project.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// RouteContext / contexteRoute : params est un Promise (Next 16)
// Route context: params is a Promise (Next 16)
type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

// parseProjectId / parserIdProjet : convertit et valide l'id
// Converts and validates the project id
function parseProjectId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

// GET /api/projects/[projectId]/competitors
// listProjectCompetitors / listerConcurrentsProjet : renvoie les concurrents d'un projet
// Returns all competitors for a given project
export async function GET(_request: Request, context: RouteContext) {
  const { projectId: rawId } = await context.params;
  const projectId = parseProjectId(rawId);

  if (!projectId) {
    return NextResponse.json(
      {
        message:
          'Paramètre projectId invalide. / Invalid projectId parameter.',
      },
      { status: 400 },
    );
  }

  try {
    const competitors = await prisma.competitor.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        monitoredPages: true, // utile si on veut afficher le nombre de pages, etc. / useful if we want attached pages
      },
    });

    return NextResponse.json(competitors, { status: 200 });
  } catch (error) {
    console.error(
      'projectCompetitorsGetError / erreurGetConcurrentsProjet',
      error,
    );
    return NextResponse.json(
      {
        message:
          'Erreur lors du chargement des concurrents du projet. / Error loading project competitors.',
      },
      { status: 500 },
    );
  }
}

// POST /api/projects/[projectId]/competitors
// createProjectCompetitor / creerConcurrentProjet : crée un concurrent lié à ce projet
// Creates a new competitor attached to this project
export async function POST(request: Request, context: RouteContext) {
  const { projectId: rawId } = await context.params;
  const projectId = parseProjectId(rawId);

  if (!projectId) {
    return NextResponse.json(
      {
        message:
          'Paramètre projectId invalide. / Invalid projectId parameter.',
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        websiteUrl?: string;
        description?: string;
        tags?: string;
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

  const rawName =
    typeof body.name === 'string' ? body.name.trim() : '';
  const websiteUrl =
    typeof body.websiteUrl === 'string'
      ? body.websiteUrl.trim() || null
      : null;
  const description =
    typeof body.description === 'string'
      ? body.description.trim() || null
      : null;
  const tags =
    typeof body.tags === 'string' ? body.tags.trim() || null : null;

  if (!rawName) {
    return NextResponse.json(
      {
        message:
          'Le nom du concurrent est obligatoire. / Competitor name is required.',
      },
      { status: 400 },
    );
  }

  try {
    // On pourrait vérifier que le projet existe, mais la FK Prisma le garantit déjà.
    // We could check if the project exists, but Prisma FK will enforce it anyway.
    const created = await prisma.competitor.create({
      data: {
        projectId,
        name: rawName,
        websiteUrl,
        description,
        tags,
        // status utilisera la valeur par défaut (ACTIVE) définie dans le schema Prisma.
        // status will use default value (ACTIVE) from Prisma schema.
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(
      'projectCompetitorsCreateError / erreurCreationConcurrentProjet',
      error,
    );
    return NextResponse.json(
      {
        message:
          'Erreur lors de la création du concurrent pour ce projet. / Error creating competitor for this project.',
      },
      { status: 500 },
    );
  }
}
