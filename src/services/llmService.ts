import { v4 as uuidv4 } from 'uuid';

import { getLLMConfig } from '../config';
import { Flashcard } from '../types';

import { truncateContent } from './llmHelpers';
import { mockFlashcards } from './mockFlashcards';

// This service is compatible with both OpenAI and LMStudio APIs

// Cap the content we send to the model at roughly 16,000 tokens (~8,000 words).
// truncateContent works on characters, so convert using ~4 characters per token.
const MAX_INPUT_TOKENS = 16000;
const MAX_INPUT_CHARS = MAX_INPUT_TOKENS * 4;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

interface FlashcardResponse {
  flashcards: Array<{
    question: string;
    answer: string;
  }>;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export const extractFlashcards = async (
  content: string,
  apiKey?: string,
  useMock: boolean = false,
): Promise<Flashcard[]> => {
  if (useMock) {
    return mockFlashcards.map((card) => ({
      id: uuidv4(),
      question: card.question,
      answer: card.answer,
    }));
  }

  const config = getLLMConfig();
  try {
    if (!config.baseUrl) {
      throw new Error('API base URL is not configured. Please check your environment variables.');
    }
    const isProxyRequired = true;

    let apiKeyToUse = '';
    if (apiKey !== undefined && apiKey !== '') {
      apiKeyToUse = apiKey;
    } else if (config.defaultApiKey !== undefined && config.defaultApiKey !== '') {
      apiKeyToUse = config.defaultApiKey;
    } else {
      apiKeyToUse = isProxyRequired ? 'not-needed' : '';
    }

    let baseURL = config.baseUrl;

    if (isProxyRequired) {
      baseURL = 'http://localhost:3001/api/v1';
    }

    const truncatedContent = truncateContent(content, MAX_INPUT_CHARS);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that creates flashcards from educational content.
        Extract key concepts and create question-answer pairs that would be useful for studying.
        Focus on important facts, definitions, and concepts.
        Create between 10-20 flashcards depending on the content length.
        Format your response as a valid JSON object with a "flashcards" array containing objects with "question" and "answer" properties.`,
      },
      {
        role: 'user',
        content: `Create flashcards from the following content:\n\n${truncatedContent}`,
      },
    ];

    const requestBody = {
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      stream: false,
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKeyToUse !== '') {
      headers.Authorization = `Bearer ${apiKeyToUse}`;
    }

    let responseContent: string | undefined;

    try {
      const requestBodyString = JSON.stringify(requestBody);

      const url = `${baseURL}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBodyString,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const responseData = await response.json() as ChatCompletionResponse;
      responseContent = responseData.choices[0]?.message?.content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Network error when connecting to ${baseURL}: ${errorMessage}`);
    }

    if (responseContent === undefined || responseContent === '') {
      throw new Error('No response from LLM API');
    }

    const parsedResponse = JSON.parse(responseContent) as FlashcardResponse;

    if (parsedResponse.flashcards === undefined
      || Array.isArray(parsedResponse.flashcards) === false) {
      throw new Error('Invalid response format from LLM');
    }

    return parsedResponse.flashcards.map((card) => ({
      id: uuidv4(),
      question: card.question,
      answer: card.answer,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract flashcards: ${errorMessage}`);
  }
};
