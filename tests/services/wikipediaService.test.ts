import axios from 'axios';

import { fetchWikipediaContent } from '../../src/services/wikipediaService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Wikipedia Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockElement = {
      innerHTML: '',
      querySelector: jest.fn().mockReturnValue({
        textContent: 'Parsed content',
        querySelectorAll: jest.fn().mockReturnValue([{
          parentNode: {
            removeChild: jest.fn()
          }
        }]),
      }),
    };

    document.createElement = jest.fn().mockReturnValue(mockElement);
  });

  test('fetches and parses Wikipedia content successfully', async () => {
    const mockWikiResponse = {
      data: {
        parse: {
          title: 'Test Article',
          text: {
            '*': '<div id="mw-content-text">Test Wikipedia content</div>',
          },
        },
      },
    };

    mockedAxios.get.mockResolvedValue(mockWikiResponse);

    const result = await fetchWikipediaContent('https://en.wikipedia.org/wiki/Test_Article');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('https://en.wikipedia.org/w/api.php?action=parse&page=Test_Article'),
    );

    expect(result).toEqual({
      title: 'Test Article',
      content: 'Parsed content',
    });
  });

  test('throws error for invalid Wikipedia URL', async () => {
    await expect(fetchWikipediaContent('https://example.com/not-wikipedia')).rejects.toThrow('Invalid Wikipedia URL');
  });

  test('throws error when Wikipedia API returns an error', async () => {
    const mockErrorResponse = {
      data: {
        error: {
          info: 'Page not found',
        },
      },
    };

    mockedAxios.get.mockResolvedValue(mockErrorResponse);

    await expect(fetchWikipediaContent('https://en.wikipedia.org/wiki/Nonexistent_Page')).rejects.toThrow('Wikipedia API error: Page not found');
  });

  test('throws error when Wikipedia API response is missing parse data', async () => {
    const mockInvalidResponse = {
      data: {},
    };

    mockedAxios.get.mockResolvedValue(mockInvalidResponse);

    await expect(fetchWikipediaContent('https://en.wikipedia.org/wiki/Test_Article')).rejects.toThrow('Failed to parse Wikipedia content');
  });

  test('handles Axios errors properly', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(fetchWikipediaContent('https://en.wikipedia.org/wiki/Test_Article')).rejects.toThrow('Failed to fetch Wikipedia content: Network error');
  });
});
