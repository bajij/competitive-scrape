// projectsApiRoute / routeApiProjets : liste et création de projets
// Projects API route: list and create projects

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Frequency } from '@prisma/client';

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

// GET /api/projects
// listProjects / listerProjets : renvoie les projets avec le nombre de concurrents
// Returns projects with competitor count
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { competitors: true },
        },
      },
    });

    const payload = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      frequency: project.frequency,
      competitorCount: project._count.competitors,
      createdAt: project.createdAt,
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('projectsGetError / erreurGetProjets', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors du chargement des projets. / Error loading projects.',
      },
      { status: 500 },
    );
  }
}

// POST /api/projects
// createProject / creerProjet : crée un nouveau projet de veille
// Creates a new watch project
export async function POST(request: Request) {
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

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  if (!rawName) {
    return NextResponse.json(
      {
        message:
          'Le nom du projet est obligatoire. / Project name is required.',
      },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === 'string'
      ? body.description.trim() || null
      : null;

  const validatedFrequency =
    validateFrequency(body.frequency) ?? 'MANUAL';

  try {
    const created = await prisma.project.create({
      data: {
        name: rawName,
        description,
        frequency: validatedFrequency,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('createProjectError / erreurCreationProjet', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors de la création du projet. / Error creating project.',
      },
      { status: 500 },
    );
  }
}
