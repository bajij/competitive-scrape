// apiClient / clientApi : petit helper générique pour les appels HTTP JSON.
// Small generic helper for HTTP JSON calls.

export type ApiErrorBody = {
  // optionalMessage / messageOptionnel : message d'erreur renvoyé par l'API
  // Error message returned by the API
  message?: string;
};

// apiJson / appelJson : effectue un fetch, parse le JSON et gère les erreurs.
// Performs a fetch, parses JSON and handles errors.
export async function apiJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  defaultErrorMessage?: string,
): Promise<T> {
  const response = await fetch(input, init);

  let body: unknown = null;

  // safeJsonParse / parseJsonSecurise : on tente de parser le JSON sans planter.
  // We try to parse JSON safely (without throwing).
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const messageFromBody =
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as ApiErrorBody).message === 'string'
        ? (body as ApiErrorBody).message
        : undefined;

    const message =
      messageFromBody ??
      defaultErrorMessage ??
      'Erreur réseau inconnue. / Unknown network error.';

    throw new Error(message);
  }

  // Ici on fait confiance au typage T côté appelant.
  // Here we trust the caller to provide the correct T type.
  return body as T;
}
