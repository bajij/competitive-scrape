// projectReportsApiRoute / routeApiRapportsProjet : liste et création de rapports de veille
// Project reports API route: list and create watch reports

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { openai } from '@/lib/openaiClient';
import { Prisma } from '@prisma/client';

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

// AiReportResult / resultatRapportIA : structure interne pour l'IA
// Internal structure for AI-generated report data
type AiReportResult = {
  aiSummary: string;
  highlights: Prisma.InputJsonValue;
};

// truncateForPrompt / tronquerPourPrompt : évite d'envoyer des blobs énormes à l'IA
// Avoid sending huge blobs to the AI
function truncateForPrompt(
  value: string | null,
  maxLength: number,
): string {
  if (!value) return 'null';
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + '…';
}

// buildChangesPrompt / construirePromptChangements : prépare les données textes pour le prompt IA
// Build text payload from changes for the AI prompt
function buildChangesPrompt(changes: {
  id: number;
  changeType: string;
  field: string | null;
  changeSummary: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  monitoredPage: {
    url: string;
    pageType: string;
    competitor: {
      name: string;
    };
  };
}[]): string {
  if (changes.length === 0) {
    return 'Aucun changement détecté sur la période. / No changes detected during the period.';
  }

  // maxLines / nbMaxLignes : limite le volume envoyé à l'IA
  // Limit number of lines sent to the AI
  const maxLines = 200;
  const sliced = changes.slice(0, maxLines);

  const MAX_PRICING_JSON_LENGTH = 400;

  const lines = sliced.map((change) => {
    const dateStr = change.createdAt.toISOString();
    const competitorName = change.monitoredPage.competitor.name;
    const pageType = change.monitoredPage.pageType;
    const url = change.monitoredPage.url;
    const type = change.changeType;
    const field = change.field ?? 'N/A';
    const summary = change.changeSummary ?? '';

    // Pour les changements de prix, on ajoute un aperçu des JSON old/new
    // For PRICE changes, we append a short preview of old/new pricing JSON
    if (type === 'PRICE') {
      const oldPricingPreview = truncateForPrompt(
        change.oldValue,
        MAX_PRICING_JSON_LENGTH,
      );
      const newPricingPreview = truncateForPrompt(
        change.newValue,
        MAX_PRICING_JSON_LENGTH,
      );

      return `[${dateStr}] Competitor="${competitorName}" | PageType="${pageType}" | ChangeType="${type}" | Field="${field}" | URL="${url}" | Summary="${summary}" | OldPricingJson=${oldPricingPreview} | NewPricingJson=${newPricingPreview}`;
    }

    // Pour les autres changements, on garde le format simple
    // For other changes, keep simple format
    return `[${dateStr}] Competitor="${competitorName}" | PageType="${pageType}" | ChangeType="${type}" | Field="${field}" | URL="${url}" | Summary="${summary}"`;
  });

  return lines.join('\n');
}

// generateAiReport / genererRapportIA : appelle l'API OpenAI pour analyser les changements
// Calls the OpenAI API to analyze changes and produce a structured report
async function generateAiReport(params: {
  projectName: string;
  projectDescription: string | null;
  periodStart: Date;
  periodEnd: Date;
  changes: {
    id: number;
    changeType: string;
    field: string | null;
    changeSummary: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: Date;
    monitoredPage: {
      url: string;
      pageType: string;
      competitor: {
        name: string;
      };
    };
  }[];
}): Promise<AiReportResult | null> {
  // Si aucune clé API, on ne tente pas d'appel IA
  // If no API key, do not attempt AI call
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      '[projectReportsApi] OPENAI_API_KEY manquante, génération IA ignorée. / ' +
        'OPENAI_API_KEY missing, skipping AI generation.',
    );
    return null;
  }

  const { projectName, projectDescription, periodStart, periodEnd, changes } =
    params;

  // S'il n'y a aucun changement, on renvoie simplement un message statique
  // If there are no changes, return a static message
  if (changes.length === 0) {
    return {
      aiSummary:
        'Aucun changement détecté sur les pages surveillées pendant cette période. / No changes detected on monitored pages during this period.',
      highlights: [], // tableau vide JSON / empty JSON array
    };
  }

  const changesText = buildChangesPrompt(changes);

  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);

  const projectDescriptionText =
    projectDescription && projectDescription.trim().length > 0
      ? projectDescription
      : 'Pas de description fournie. / No description provided.';

    const systemPrompt =
    // Rôle : assistant de veille marketing
    // Role: marketing competitive intelligence assistant
    'Tu es un assistant de veille concurrentielle pour une équipe marketing B2B. ' +
    'Tu analyses les changements détectés sur les sites des concurrents (pricing, offres, contenus) ' +
    'et tu produis un rapport synthétique, exploitable par un décideur marketing francophone. ' +
    'Tu dois identifier clairement les mouvements de prix, les nouveaux produits/plans, ' +
    'les changements de message (slogan, titres, sections clés) et les éventuels problèmes techniques.';

  const userPrompt =
    [
      'Contexte projet :',
      `- Nom du projet : ${projectName}`,
      `- Description : ${projectDescriptionText}`,
      '',
      `Période analysée : du ${periodStartStr} au ${periodEndStr}.`,
      '',
      'Données de changements (une ligne par changement) :',
      'Chaque ligne suit le format : [date] Competitor="..." | PageType="..." | ChangeType="..." | Field="..." | URL="..." | Summary="..."',
      '',
      changesText,
      '',
      'Tâche :',
      "1) Produis un résumé global en français (5 à 10 lignes maximum) des évolutions concurrentielles sur la période.",
      "2) Propose une liste de 3 à 8 faits marquants sous forme d'objets structurés.",
      '',
      'Les faits marquants doivent couvrir en priorité :',
      '- les changements de prix (hausse/baisse, apparition/disparition de plans),',
      '- les nouveaux produits / nouvelles offres,',
      '- les modifications importantes de messages (nouveau slogan, nouvelle accroche, réécriture majeure),',
      "- les problèmes techniques visibles dans les résumés (ex: page indisponible, erreur, contenu vide).",
      '',
      'Format de sortie JSON STRICT (pas de texte hors JSON) :',
      '{',
      '  "summary": "string, résumé global en français",',
      '  "highlights": [',
      '    {',
      '      "title": "string, très courte (ex: \\"Hausse du plan de base\\", \\"Nouveau plan intermédiaire\\", \\"Problème sur la page pricing\\")",',
      '      "detail": "string, 1 à 3 phrases en français expliquant le changement et son sens business",',
      '      "competitor": "nom du concurrent",',
      '      "changeType": "TEXT | PRICE | SECTION_ADDED | SECTION_REMOVED | OTHER",',
      '      "impact": "HIGH | MEDIUM | LOW"',
      '    }',
      '  ]',
      '}',
      '',
      'IMPORTANT :',
      '- Utilise les informations chiffrées présentes dans les résumés (par exemple les anciens/nouveaux prix) quand elles sont disponibles.',
      '- Quand un nouveau produit/plan apparaît clairement, fais un highlight dédié (titre commençant par \\"Nouveau produit\\" ou \\"Nouveau plan\\").',
      '- Quand une offre disparaît, fais un highlight dédié (titre du type \\"Suppression d’un plan\\").',
      '- Quand le contenu ou le message principal change beaucoup, fais un highlight de type TEXT (ex: \\"Repositionnement du message marketing\\").',
      '- Si tu détectes des problèmes (erreur, contenu vide, etc.), ajoute un highlight de type OTHER avec impact HIGH si critique.',
      '',
      'Ne commente pas le JSON. Ne mets pas de texte avant ou après le JSON.',
    ].join('\n');


  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      // response_format en JSON pour forcer un JSON valide
      // JSON response_format to force valid JSON
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error(
        '[projectReportsApi] Réponse IA vide. / Empty AI response.',
      );
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error(
        '[projectReportsApi] Erreur de parsing JSON IA. / Error parsing AI JSON.',
        parseError,
      );
      return null;
    }

    const aiSummary: string =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary
        : 'Résumé IA indisponible. / AI summary unavailable.';

    // On accepte ici n'importe quel JSON valide pour highlights
    // We accept any valid JSON value for highlights
    const highlightsValue: Prisma.InputJsonValue = Array.isArray(
      parsed.highlights,
    )
      ? parsed.highlights
      : [];

    return {
      aiSummary,
      highlights: highlightsValue,
    };
  } catch (error) {
    console.error(
      '[projectReportsApi] Erreur lors de l’appel OpenAI. / Error calling OpenAI.',
      error,
    );
    return null;
  }
}

// GET /api/projects/[projectId]/reports
// listReports / listerRapports : renvoie la liste des rapports d'un projet
// Returns the list of reports for a project
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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          message: 'Projet introuvable. / Project not found.',
        },
        { status: 404 },
      );
    }

    const reports = await prisma.report.findMany({
      where: { projectId },
      orderBy: { generatedAt: 'desc' },
    });

    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error('reportsGetError / erreurGetRapports', error);
    return NextResponse.json(
      {
        message:
          'Erreur lors du chargement des rapports. / Error loading reports.',
      },
      { status: 500 },
    );
  }
}

// POST /api/projects/[projectId]/reports
// createReport / creerRapport : génère un rapport sur une période, avec IA si possible
// Creates a report for a period, using AI if possible
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
        periodStart?: string;
        periodEnd?: string;
        useAi?: boolean;
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

  // parseDates / parserDates : on parse ou on applique la période par défaut (7 jours)
  // parseDates: parse dates or apply default period (last 7 days)
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;

  if (body.periodStart) {
    const d = new Date(body.periodStart);
    if (!Number.isFinite(d.getTime())) {
      return NextResponse.json(
        {
          message:
            'periodStart invalide. / Invalid periodStart.',
        },
        { status: 400 },
      );
    }
    periodStart = d;
  }

  if (body.periodEnd) {
    const d = new Date(body.periodEnd);
    if (!Number.isFinite(d.getTime())) {
      return NextResponse.json(
        {
          message:
            'periodEnd invalide. / Invalid periodEnd.',
        },
        { status: 400 },
      );
    }
    periodEnd = d;
  }

  // Si une seule date fournie, on dérive l'autre
  // If only one date is provided, derive the other
  if (periodStart && !periodEnd) {
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
  } else if (!periodStart && periodEnd) {
    periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);
  }

  // Si aucune date fournie, période par défaut = 7 derniers jours
  // If no dates are provided, default period = last 7 days
  if (!periodStart || !periodEnd) {
    periodEnd = new Date();
    periodStart = new Date();
    periodStart.setDate(periodEnd.getDate() - 7);
  }

  // Normalisation ordre des dates
  // Normalize date order
  if (periodStart.getTime() > periodEnd.getTime()) {
    const tmp = periodStart;
    periodStart = periodEnd;
    periodEnd = tmp;
  }

  const useAi =
    body.useAi === undefined ? true : Boolean(body.useAi);

  try {
    // Vérifier que le projet existe
    // Check that the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          message: 'Projet introuvable. / Project not found.',
        },
        { status: 404 },
      );
    }

    // Récupérer les changements sur la période pour ce projet
    // Fetch changes for this project in the given period
    const changes = await prisma.change.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        monitoredPage: {
          competitor: {
            projectId,
          },
        },
      },
      include: {
        monitoredPage: {
          select: {
            url: true,
            pageType: true,
            competitor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let aiSummary: string | null = null;
    let highlights: Prisma.InputJsonValue | undefined = undefined;

    if (useAi) {
      const aiResult = await generateAiReport({
        projectName: project.name,
        projectDescription: project.description,
        periodStart,
        periodEnd,
        changes,
      });

      if (aiResult) {
        aiSummary = aiResult.aiSummary;
        highlights = aiResult.highlights;
      }
    }

    // Créer le rapport en base
    // Create report in DB
    const created = await prisma.report.create({
      data: {
        projectId,
        periodStart,
        periodEnd,
        generatedAt: new Date(),
        aiSummary,
        highlights,
        // pdfUrl laissé à null pour l'instant / pdfUrl left null for now
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(
      'createReportError / erreurCreationRapport',
      error,
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      // P2025 : enregistrement lié introuvable
      // P2025: related record not found
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
          'Erreur lors de la création du rapport. / Error creating report.',
      },
      { status: 500 },
    );
  }
}
