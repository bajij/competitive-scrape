// projectApiRoute / routeApiProjet : mise à jour et suppression d'un projet
// Project API route: update and delete a project

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, type Frequency } from '@prisma/client';

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

// validateFrequency / validerFrequence : vérifie que la fréquence est autorisée
// Validates that the frequency is allowed
function validateFrequency(
  frequency: string | undefined,
): Frequency | undefined {
  if (!frequency) return undefined;

  const allowed: Frequency[] = ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'];
  return allowed.includes(frequency as Frequency)
    ? (frequency as Frequency)
    : undefined;
}

// PATCH /api/projects/[projectId]
// updateProject / mettreAJourProjet : met à jour nom/description/fréquence
// Update project name/description/frequency
export async function PATCH(request: Request, context: RouteContext) {
  const { projectId: rawId } = await context.params;
  console.log('>>> API PATCH /api/projects/[projectId]', rawId); // debugFR/EN

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
        description?: string | null;
        frequency?: string;
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
            'Le nom du projet ne peut pas être vide. / Project name cannot be empty.',
        },
        { status: 400 },
      );
    }
    data.name = trimmed;
  }

  if (body.description !== undefined) {
    const trimmed =
      typeof body.description === 'string'
        ? body.description.trim()
        : '';
    data.description = trimmed || null;
  }

  const validatedFrequency = validateFrequency(body.frequency);
  if (body.frequency && !validatedFrequency) {
    return NextResponse.json(
      {
        message:
          'Fréquence invalide. Utilisez MANUAL, DAILY, WEEKLY ou MONTHLY. / Invalid frequency. Use MANUAL, DAILY, WEEKLY or MONTHLY.',
      },
      { status: 400 },
    );
  }

  if (validatedFrequency) {
    data.frequency = validatedFrequency;
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
    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('updateProjectError / erreurMiseAJourProjet', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      // P2025 : enregistrement à mettre à jour non trouvé / record to update not found
      return NextResponse.json(
        {
          message:
            'Projet introuvable. / Project not found.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message:
          'Erreur lors de la mise à jour du projet. / Error updating project.',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/[projectId]
// deleteProject / supprimerProjet : supprime le projet et toutes les données associées
// Delete project and all related data
export async function DELETE(_request: Request, context: RouteContext) {
  const { projectId: rawId } = await context.params;
  console.log('>>> API DELETE /api/projects/[projectId]', rawId); // debugFR/EN

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
    const deleted = await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json(
      {
        message:
          'Projet et données associées supprimés avec succès. / Project and related data deleted successfully.',
        deletedId: deleted.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('deleteProjectError / erreurSuppressionProjet', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      // P2025 : enregistrement à supprimer non trouvé.
      // On rend la suppression idempotente : déjà supprimé => état ok pour le client.
      // P2025: record to delete not found.
      // We make delete idempotent: already deleted => state is fine for the client.
      return NextResponse.json(
        {
          message:
            'Projet déjà supprimé ou introuvable. État synchronisé. / Project already deleted or not found. State is now synced.',
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        message:
          'Erreur lors de la suppression du projet. / Error deleting project.',
      },
      { status: 500 },
    );
  }
}
