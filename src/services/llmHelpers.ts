// Helper functions for LLM services

export const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.substring(0, maxLength)}... [Content truncated due to length]`;
};

export const needsCORSproxy = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch (error) {
    return false;
  }
};
