'use client';

import { useState, FormEvent } from 'react';

// AiHighlight / faitMarquantIA : un fait marquant structuré par l'IA
// AIHighlight: one structured AI highlight item
export type AiHighlight = {
  title: string;
  detail: string;
  competitor: string;
  changeType: string;
  impact: string;
};

// ProjectInfo / infoProjet : informations minimales sur le projet
// Minimal information about the project
export type ProjectInfo = {
  id: number;
  name: string;
  description: string | null;
};

// ReportSummary / resumeRapport : représentation côté client d'un rapport
// Client-side representation of a report
export type ReportSummary = {
  id: number;
  projectId: number;
  periodStart: string | null;
  periodEnd: string | null;
  generatedAt: string;
  aiSummary: string | null;
  highlights: AiHighlight[];
};

type ProjectReportsPageClientProps = {
  project: ProjectInfo;
  initialReports: ReportSummary[];
};

// ApiReport / rapportApi : forme brute renvoyée par l'API
// Raw report shape returned by the API
type ApiReport = {
  id: number;
  projectId: number;
  periodStart: string | null;
  periodEnd: string | null;
  generatedAt: string;
  aiSummary: string | null;
  highlights?: unknown;
};

// formatDate / formaterDate : format simple date FR
// Simple FR date format
function formatDate(value: string | null): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('fr-FR', {
    dateStyle: 'medium',
  });
}

// formatDateTime / formaterDateHeure : format date+heure FR
// Simple FR date+time format
function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// normalizeHighlights / normaliserFaitsMarquants : sécurise le JSON reçu
// Safely normalizes JSON into AI highlights
function normalizeHighlights(raw: unknown): AiHighlight[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const obj = item as any;
    return {
      title: typeof obj?.title === 'string' ? obj.title : '',
      detail: typeof obj?.detail === 'string' ? obj.detail : '',
      competitor:
        typeof obj?.competitor === 'string'
          ? obj.competitor
          : '',
      changeType:
        typeof obj?.changeType === 'string'
          ? obj.changeType
          : '',
      impact:
        typeof obj?.impact === 'string' ? obj.impact : '',
    };
  });
}

// mapApiReport / mapperRapportApi : convertit API → client
// Converts API report into client-side summary
function mapApiReport(api: ApiReport): ReportSummary {
  return {
    id: api.id,
    projectId: api.projectId,
    periodStart: api.periodStart,
    periodEnd: api.periodEnd,
    generatedAt: api.generatedAt,
    aiSummary: api.aiSummary,
    highlights: normalizeHighlights(api.highlights),
  };
}

export default function ProjectReportsPageClient({
  project,
  initialReports,
}: ProjectReportsPageClientProps) {
  // reportsState / etatRapports : liste des rapports affichés
  // Reports list in UI
  const [reports, setReports] = useState<ReportSummary[]>(
    initialReports,
  );

  // formState / etatFormulaire : période pour générer un rapport
  // Form state: period to generate a report
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');

  // loadingState / etatChargement : refresh / génération
  // Loading state for refresh / generation
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] =
    useState<boolean>(false);

  // errorState / etatErreur : message d'erreur
  // Error message
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  // statusMessage / messageStatut : message informatif (succès)
  // Informational status message
  const [statusMessage, setStatusMessage] = useState<
    string | null
  >(null);

  // fetchReports / chargerRapports : recharge les rapports depuis l'API
  // Reload reports from the API
  async function fetchReports() {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const response = await fetch(
        `/api/projects/${project.id}/reports`,
      );
      const rawBody = (await response.json().catch(() => null)) as
        | ApiReport[]
        | { message?: string }
        | null;

      if (!response.ok || !rawBody) {
        const message =
          (rawBody as any)?.message ??
          'Erreur lors du chargement des rapports. / Error loading reports.';
        throw new Error(message);
      }

      if (!Array.isArray(rawBody)) {
        throw new Error(
          'Réponse inattendue du serveur (rapports). / Unexpected server response (reports).',
        );
      }

      const mapped = rawBody.map(mapApiReport);
      setReports(mapped);
      setStatusMessage(
        'Rapports rechargés. / Reports reloaded.',
      );
    } catch (error) {
      console.error(
        'fetchReportsError / erreurChargementRapports',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors du chargement des rapports. / Error loading reports.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  // handleGenerateReport / gererGenerationRapport : POST pour générer un rapport IA
  // Sends a POST request to generate an AI report
  async function handleGenerateReport(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const payload: {
        periodStart?: string;
        periodEnd?: string;
        useAi?: boolean;
      } = {
        useAi: true, // forcer l’usage de l’IA / force AI usage
      };

      if (periodStart) payload.periodStart = periodStart;
      if (periodEnd) payload.periodEnd = periodEnd;

      const response = await fetch(
        `/api/projects/${project.id}/reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const rawBody = (await response
        .json()
        .catch(() => null)) as ApiReport | { message?: string } | null;

      if (!response.ok || !rawBody) {
        const message =
          (rawBody as any)?.message ??
          'Erreur lors de la génération du rapport. / Error generating report.';
        throw new Error(message);
      }

      const created = mapApiReport(rawBody as ApiReport);

      // On ajoute le rapport en tête / Add report at top
      setReports((prev) => [created, ...prev]);

      const hasCustomPeriod = periodStart || periodEnd;
      setStatusMessage(
        hasCustomPeriod
          ? 'Rapport IA généré pour la période sélectionnée. / AI report generated for the selected period.'
          : 'Rapport IA généré sur les 7 derniers jours. / AI report generated for the last 7 days.',
      );
    } catch (error) {
      console.error(
        'generateReportError / erreurGenerationRapport',
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la génération du rapport. / Error generating report.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
      {/* Formulaire de génération / generation form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <h2 className="mb-2 text-lg font-semibold">
          Générer un rapport de veille (IA)
        </h2>
        {project.description && (
          <p className="mb-4 text-xs text-slate-400">
            {project.description}
          </p>
        )}

        <form
          onSubmit={handleGenerateReport}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="period-start"
              className="text-sm font-medium text-slate-100"
            >
              Début de période (optionnel)
            </label>
            <input
              id="period-start"
              type="date"
              value={periodStart}
              onChange={(event) =>
                setPeriodStart(event.target.value)
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="period-end"
              className="text-sm font-medium text-slate-100"
            >
              Fin de période (optionnel)
            </label>
            <input
              id="period-end"
              type="date"
              value={periodEnd}
              onChange={(event) =>
                setPeriodEnd(event.target.value)
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400">
              Si les dates sont vides, le rapport portera sur les 7
              derniers jours. / If both dates are empty, the report
              covers the last 7 days.
            </p>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void fetchReports()}
              className="text-xs font-medium text-sky-400 hover:text-sky-300"
              disabled={isLoading || isGenerating}
            >
              Rafraîchir les rapports / Refresh reports
            </button>

            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating
                ? 'Génération du rapport IA...'
                : 'Générer le rapport IA'}
            </button>
          </div>

          {statusMessage && (
            <p className="text-xs text-slate-300">
              {statusMessage}
            </p>
          )}
        </form>
      </div>

      {/* Liste des rapports / reports list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Rapports générés
            </h2>
            <p className="text-xs text-slate-400">
              {reports.length}{' '}
              {reports.length <= 1 ? 'rapport' : 'rapports'}
            </p>
          </div>
        </div>

        {isLoading && reports.length === 0 ? (
          <p className="text-sm text-slate-300">
            Chargement des rapports... / Loading reports...
          </p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-300">
            Aucun rapport pour le moment. Générez un premier rapport
            IA avec le formulaire. / No report yet. Generate your
            first AI report using the form.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((report, index) => {
              const label = `Rapport #${
                reports.length - index
              }`;
              const periodText =
                report.periodStart && report.periodEnd
                  ? `${formatDate(
                      report.periodStart,
                    )} → ${formatDate(report.periodEnd)}`
                  : '7 derniers jours (par défaut).';

              const generatedText = formatDateTime(
                report.generatedAt,
              );
              const hasHighlights =
                report.highlights &&
                report.highlights.length > 0;

              return (
                <li
                  key={report.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {label}
                        </p>
                        <p className="text-xs text-slate-300">
                          Période :{' '}
                          <span className="font-medium">
                            {periodText}
                          </span>
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Généré le {generatedText}
                      </p>
                    </div>

                    {/* Résumé IA / AI summary */}
                    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                      <p className="mb-1 font-semibold">
                        Résumé du rapport / Report summary
                      </p>
                      <p className="whitespace-pre-line">
                        {report.aiSummary ??
                          'Résumé IA non disponible. / AI summary not available.'}
                      </p>
                    </div>

                    {/* Faits marquants IA / AI highlights */}
                    {hasHighlights && (
                      <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                        <p className="mb-2 text-xs font-semibold text-slate-200">
                          Faits marquants / Key highlights
                        </p>
                        <ul className="flex flex-col gap-2 text-[11px] text-slate-200">
                          {report.highlights.map((h, hIndex) => (
                            <li
                              key={`${report.id}-${hIndex}`}
                              className="rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2"
                            >
                              <p className="font-semibold">
                                {h.title || 'Fait marquant'}
                              </p>
                              <p className="mt-1 text-slate-200">
                                {h.detail}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                Concurrent :{' '}
                                <span className="font-medium">
                                  {h.competitor || 'N/A'}
                                </span>{' '}
                                · Type :{' '}
                                <span className="font-medium">
                                  {h.changeType || 'N/A'}
                                </span>{' '}
                                · Impact :{' '}
                                <span className="font-medium">
                                  {h.impact || 'N/A'}
                                </span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
