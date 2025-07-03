import { v4 as uuidv4 } from 'uuid';

import { getLLMConfig } from '../config';
import { Flashcard } from '../types';

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
  const config = getLLMConfig();
  try {
    const isProxyRequired = needsCORSproxy(config.baseUrl);
    const apiKeyToUse = isProxyRequired
      ? (apiKey || config.defaultApiKey || 'not-needed')
      : (apiKey || config.defaultApiKey || '');

    let baseURL = config.baseUrl;

    if (isProxyRequired) {
      baseURL = 'http://localhost:3001/api/v1';
      console.log('Using proxy server for LMStudio:', baseURL);
    }

    const truncatedContent = truncateContent(content, 3000);

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

    if (apiKeyToUse && !isProxyRequired) {
      headers.Authorization = `Bearer ${apiKeyToUse}`;
    }

    let responseContent: string | undefined;

    try {
      const requestBodyString = JSON.stringify(requestBody);
      console.log('Final request body string:', requestBodyString);

      const url = `${baseURL}/chat/completions${useMock ? '?mock=true' : ''}`;
      console.log(`Making request to: ${url} ${useMock ? '(MOCK MODE)' : ''}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: useMock ? { ...headers, 'X-Use-Mock': 'true' } : headers,
        body: requestBodyString,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const responseData: ChatCompletionResponse = await response.json();
      responseContent = responseData.choices[0]?.message?.content;
    } catch (error: any) {
      console.error('Fetch error details:', error);
      throw new Error(`Network error when connecting to ${baseURL}: ${error.message || 'Unknown error'}`);
    }

    if (!responseContent) {
      throw new Error('No response from LLM API');
    }

    const parsedResponse = JSON.parse(responseContent) as FlashcardResponse;

    if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
      throw new Error('Invalid response format from OpenAI');
    }

    return parsedResponse.flashcards.map((card) => ({
      id: uuidv4(),
      question: card.question,
      answer: card.answer,
    }));
  } catch (error) {
    console.error('Error extracting flashcards:', error);
    throw new Error(`Failed to extract flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.substring(0, maxLength)}... [Content truncated due to length]`;
};

const needsCORSproxy = (url: string): boolean => {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  return hostname === 'localhost' || hostname === '127.0.0.1';
};
