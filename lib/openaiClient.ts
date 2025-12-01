// openaiClient / clientOpenAI : client partagé pour l'API OpenAI
// Shared client for the OpenAI API

import OpenAI from 'openai';

// onWarnMissingKey / avertirCleManquante : avertit si aucune clé n'est définie
// Warn if no API key is defined
if (!process.env.OPENAI_API_KEY) {
  console.warn(
    '[openaiClient] OPENAI_API_KEY non définie. ' +
      'Les fonctionnalités IA des rapports seront désactivées. / ' +
      'OPENAI_API_KEY is not set. AI features for reports will be disabled.',
  );
}

// openai / client : instance unique du SDK OpenAI
// openai / client: single instance of the OpenAI SDK
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
