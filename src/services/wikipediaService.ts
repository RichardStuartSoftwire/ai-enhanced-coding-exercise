import axios from 'axios';

interface WikipediaResponse {
  parse?: {
    title: string;
    text: {
      '*': string;
    };
  };
  error?: {
    info: string;
  };
}

interface WikipediaContent {
  title: string;
  content: string;
}

// Helper functions defined once at the top to fix no-use-before-define
const extractTitleFromUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.includes('wikipedia.org')) {
      return null;
    }

    const pathParts = parsedUrl.pathname.split('/');
    return pathParts[pathParts.length - 1];
  } catch {
    return null;
  }
};

const extractTextFromHtml = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const contentDiv = tempDiv.querySelector('#mw-content-text');
  if (contentDiv === null) {
    return tempDiv.textContent !== null ? tempDiv.textContent : '';
  }

  const elementsToRemove = [
    '.mw-empty-elt',
    '.mw-editsection',
    '.reference',
    '.references',
    '.reflist',
    '.navbox',
    '.thumbcaption',
    '.mbox-image',
    '.mbox-text',
    'table',
    '.infobox',
    '.sidebar',
    '.ambox',
    '.hatnote',
    '.metadata',
    '.noprint',
    '.mw-jump-link',
    '.mw-headline',
    'style',
    'script',
    'noscript',
  ];

  elementsToRemove.forEach((selector) => {
    contentDiv.querySelectorAll(selector).forEach((el) => {
      if (el.parentNode !== null) {
        el.parentNode.removeChild(el);
      }
    });
  });

  let text = contentDiv.textContent !== null ? contentDiv.textContent : '';

  text = text
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
};

export const fetchWikipediaContent = async (url: string): Promise<WikipediaContent> => {
  try {
    const title = extractTitleFromUrl(url);

    if (title === null) {
      throw new Error('Invalid Wikipedia URL');
    }

    const apiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${title}&format=json&prop=text&origin=*`;

    const response = await axios.get<WikipediaResponse>(apiUrl);

    if (response.data.error !== undefined) {
      throw new Error(`Wikipedia API error: ${response.data.error.info}`);
    }

    if (response.data.parse === undefined) {
      throw new Error('Failed to parse Wikipedia content');
    }

    const htmlContent = response.data.parse.text['*'];
    const plainText = extractTextFromHtml(htmlContent);

    return {
      title: response.data.parse.title,
      content: plainText,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch Wikipedia content: ${error.message}`);
    }
    throw error;
  }
};
