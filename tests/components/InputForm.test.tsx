import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InputForm from '../../src/components/InputForm';
import { extractFlashcards } from '../../src/services/llmService';
import { fetchWikipediaContent } from '../../src/services/wikipediaService';
import { getLLMConfig } from '../../src/config';
import userEvent from '@testing-library/user-event';

jest.mock('../../src/services/llmService', () => ({
  extractFlashcards: jest.fn()
}));

jest.mock('../../src/services/wikipediaService', () => ({
  fetchWikipediaContent: jest.fn()
}));

jest.mock('../../src/config', () => ({
  getLLMConfig: jest.fn().mockReturnValue({
    baseUrl: 'http://test-api.com',
    model: 'test-model',
    defaultApiKey: 'default-test-key'
  })
}));

const mockExtractFlashcards = extractFlashcards as jest.MockedFunction<typeof extractFlashcards>;
const mockFetchWikipediaContent = fetchWikipediaContent as jest.MockedFunction<typeof fetchWikipediaContent>;

describe('InputForm Component', () => {
  const mockSetFlashcardSet = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders input form with default elements', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    expect(screen.getByRole('button', { name: 'Wikipedia URL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Flashcards' })).toBeInTheDocument();
    expect(screen.getByText('🚀 Fast Mock Mode')).toBeInTheDocument();
  });

  test('switches between URL and text input modes', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    const textModeButton = screen.getByRole('button', { name: 'Custom Text' });
    fireEvent.click(textModeButton);

    expect(screen.getByRole('button', { name: 'Custom Text' })).toHaveClass('active');
    expect(screen.getByPlaceholderText('Paste your text here...')).toBeInTheDocument();

    const urlModeButton = screen.getByRole('button', { name: 'Wikipedia URL' });
    fireEvent.click(urlModeButton);

    expect(screen.getByRole('button', { name: 'Wikipedia URL' })).toHaveClass('active');
    expect(screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence')).toBeInTheDocument();
  });

  test('shows error when submitting without input', async () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetError).toHaveBeenCalledWith('Please enter a Wikipedia URL or text');
  });

  test('shows error when API key is missing in config', async () => {
    (getLLMConfig as jest.Mock).mockReturnValueOnce({
      baseUrl: 'http://test-api.com',
      model: 'test-model',
      defaultApiKey: ''
    });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    const inputField = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(inputField, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    fireEvent.click(screen.getByRole('checkbox'));

    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetError).toHaveBeenCalledWith('Please set your API key in LLM Settings');
  });

  test('processes Wikipedia URL input correctly', async () => {
    const mockWikiContent = {
      title: 'React',
      content: 'React is a JavaScript library for building user interfaces.'
    };
    
    const mockFlashcards = [
      { id: '1', question: 'What is React?', answer: 'A JavaScript library for building user interfaces.' }
    ];

    mockFetchWikipediaContent.mockResolvedValue(mockWikiContent);
    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockFetchWikipediaContent).toHaveBeenCalledWith('https://en.wikipedia.org/wiki/React_(JavaScript_library)');
      expect(mockExtractFlashcards).toHaveBeenCalledWith(mockWikiContent.content, undefined, expect.any(Boolean));
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        source: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)',
        cards: mockFlashcards
      }));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('processes custom text input correctly', async () => {
    const mockFlashcards = [
      { id: '1', question: 'What is TypeScript?', answer: 'A superset of JavaScript that adds static typing.' }
    ];

    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Switch to custom text mode
    const textModeButton = screen.getByRole('button', { name: 'Custom Text' });
    fireEvent.click(textModeButton);

    // Enter custom text
    const textInput = screen.getByPlaceholderText('Paste your text here...');
    fireEvent.change(textInput, { target: { value: 'TypeScript is a superset of JavaScript that adds static typing.' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockFetchWikipediaContent).not.toHaveBeenCalled();
      expect(mockExtractFlashcards).toHaveBeenCalledWith(
        'TypeScript is a superset of JavaScript that adds static typing.',
        undefined,
        expect.any(Boolean)
      );
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Custom Text Flashcards',
        source: 'Custom text',
        cards: mockFlashcards
      }));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('validates Wikipedia URL correctly', async () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Enter invalid URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/not-wikipedia' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetError).toHaveBeenCalledWith('Please enter a valid Wikipedia URL');
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  test('extracts title from Wikipedia URL correctly', async () => {
    const mockWikiContent = {
      title: 'Artificial Intelligence',
      content: 'AI content here'
    };
    
    const mockFlashcards = [
      { id: '1', question: 'What is AI?', answer: 'Artificial Intelligence' }
    ];

    mockFetchWikipediaContent.mockResolvedValue(mockWikiContent);
    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Enter URL with underscores that should be converted to spaces in title
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/Artificial_intelligence' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Artificial intelligence', // Underscores replaced with spaces
        source: 'https://en.wikipedia.org/wiki/Artificial_intelligence'
      }));
    });
  });

  test('handles API errors correctly', async () => {
    // Mock the extractFlashcards function to throw an error
    mockExtractFlashcards.mockRejectedValue(new Error('API error'));

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Enter valid URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Error: API error');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('handles Wikipedia fetch errors correctly', async () => {
    // Mock the fetchWikipediaContent function to throw an error
    mockFetchWikipediaContent.mockRejectedValue(new Error('Wikipedia API error'));

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Enter valid URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Error: Wikipedia API error');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('passes mock mode setting to extractFlashcards', async () => {
    const mockWikiContent = {
      title: 'React',
      content: 'React content'
    };

    const mockFlashcards = [{ id: '1', question: 'Q', answer: 'A' }];

    mockFetchWikipediaContent.mockResolvedValue(mockWikiContent);
    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    // Mock localStorage for mock mode setting
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue('true'),
      setItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Enter URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/Test' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Verify that mock mode (true) was passed to extractFlashcards
      expect(mockExtractFlashcards).toHaveBeenCalledWith(mockWikiContent.content, undefined, true);
    });
  });

  // Import functionality tests
  test('renders import buttons', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument();
  });

  test('switches to import JSON mode', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    const importJsonButton = screen.getByRole('button', { name: 'Import JSON' });
    fireEvent.click(importJsonButton);

    expect(importJsonButton).toHaveClass('active');
    expect(screen.getByText('Upload JSON file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select JSON File' })).toBeInTheDocument();
  });

  test('switches to import CSV mode', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    const importCsvButton = screen.getByRole('button', { name: 'Import CSV' });
    fireEvent.click(importCsvButton);

    expect(importCsvButton).toHaveClass('active');
    expect(screen.getByText('Upload CSV file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select CSV File' })).toBeInTheDocument();
  });

  test('handles valid JSON file upload', async () => {
    const validJsonContent = JSON.stringify({
      title: 'Test Flashcards',
      source: 'Test Source',
      cards: [
        { id: '1', question: 'Question 1', answer: 'Answer 1' },
        { id: '2', question: 'Question 2', answer: 'Answer 2' }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([validJsonContent], 'test-flashcards.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Switch to import JSON mode
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    // Find and trigger file input using a different approach
    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    // Metadata dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-flashcards')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Uploaded file')).toBeInTheDocument();
    });
  });

  test('handles valid CSV file upload', async () => {
    const csvContent = 'Question,Answer\n"What is React?","A JavaScript library"\n"What is TypeScript?","A superset of JavaScript"';

    const file = new File([csvContent], 'test-flashcards.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Switch to import CSV mode
    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    // Find and trigger file input using ID
    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    // Metadata dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-flashcards')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Uploaded file')).toBeInTheDocument();
    });
  });

  test('handles invalid JSON file structure', async () => {
    const invalidJsonContent = JSON.stringify({
      title: 'Test',
      // Missing cards array
    });

    const file = new File([invalidJsonContent], 'invalid.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Error: Invalid JSON file format: missing or invalid cards array');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('handles invalid CSV file format', async () => {
    const invalidCsvContent = 'Invalid,Headers\nData1,Data2';

    const file = new File([invalidCsvContent], 'invalid.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Error: CSV file must have "Question" and "Answer" headers');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('handles malformed JSON', async () => {
    const malformedJson = '{ invalid json }';

    const file = new File([malformedJson], 'malformed.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(expect.stringContaining('Error:'));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('submits metadata dialog with custom values', async () => {
    const validJsonContent = JSON.stringify({
      title: 'Original Title',
      source: 'Original Source',
      cards: [
        { id: '1', question: 'Question 1', answer: 'Answer 1' }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([validJsonContent], 'test.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    // Wait for metadata dialog
    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    // Change metadata values
    const titleInput = screen.getByLabelText('Title');
    const sourceInput = screen.getByLabelText('Source');

    fireEvent.change(titleInput, { target: { value: 'Custom Title' } });
    fireEvent.change(sourceInput, { target: { value: 'Custom Source' } });

    // Submit the dialog
    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Custom Title',
        source: 'Custom Source',
        cards: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            question: 'Question 1',
            answer: 'Answer 1'
          })
        ])
      }));
    });
  });

  test('cancels metadata dialog', async () => {
    const validJsonContent = JSON.stringify({
      title: 'Test',
      source: 'Test',
      cards: [
        { id: '1', question: 'Question 1', answer: 'Answer 1' }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([validJsonContent], 'test.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    // Wait for metadata dialog
    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    // Cancel the dialog
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Flashcard Details')).not.toBeInTheDocument();
      expect(mockSetFlashcardSet).not.toHaveBeenCalled();
    });
  });

  test('handles JSON with missing card IDs', async () => {
    const jsonWithoutIds = JSON.stringify({
      title: 'Test',
      source: 'Test',
      cards: [
        { question: 'Question 1', answer: 'Answer 1' },
        { question: 'Question 2', answer: 'Answer 2' }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([jsonWithoutIds], 'test.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    // Submit with default values
    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({
            id: 'imported-0',
            question: 'Question 1',
            answer: 'Answer 1'
          }),
          expect.objectContaining({
            id: 'imported-1',
            question: 'Question 2',
            answer: 'Answer 2'
          })
        ])
      }));
    });
  });

  test('handles CSV with special characters', async () => {
    const csvWithSpecialChars = 'Question,Answer\n"Question with ""quotes""","Answer with, comma"\n"Line with newline","Answer with tab\tcharacter"';

    const file = new File([csvWithSpecialChars], 'special.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: 'Question with "quotes"',
            answer: 'Answer with, comma'
          }),
          expect.objectContaining({
            question: 'Line with newline',
            answer: 'Answer with tab\tcharacter'
          })
        ])
      }));
    });
  });

  test('handles JSON with special characters', async () => {
    const jsonWithSpecialChars = JSON.stringify({
      title: 'Special "Chars"',
      source: 'Test\nSource',
      cards: [
        { id: '1', question: 'Question with "quotes" and, comma', answer: 'Answer with newline\nand tab\t' }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([jsonWithSpecialChars], 'special.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: 'Question with "quotes" and, comma',
            answer: 'Answer with newline\nand tab\t'
          })
        ])
      }));
    });
  });

  // Security tests for injection attacks
  test('safely handles JSON with XSS attempt in content', async () => {
    const jsonWithXSS = JSON.stringify({
      title: 'Safe Title',
      source: 'Safe Source',
      cards: [
        { id: '1', question: '<script>alert("XSS")</script>Question', answer: 'Answer' }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([jsonWithXSS], 'xss.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // The content should be stored as-is (React will handle escaping)
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: '<script>alert("XSS")</script>Question'
          })
        ])
      }));
    });
  });

  test('safely handles CSV with formula injection attempts', async () => {
    const csvWithInjection = 'Question,Answer\n"=SUM(1,2)","=HYPERLINK(""http://evil.com"",""Click"")\n"@Dangerous","+Formula"';

    const file = new File([csvWithInjection], 'injection.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // Content should be stored as-is, proper escaping happens in export
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: '=SUM(1,2)',
            answer: '=HYPERLINK("http://evil.com","Click")'
          })
        ])
      }));
    });
  });

  test('safely handles JSON with prototype pollution attempt', async () => {
    const jsonWithPrototypePollution = JSON.stringify({
      title: 'Test',
      source: 'Test',
      cards: [
        { id: '1', question: 'Question', answer: 'Answer' }
      ],
      createdAt: new Date().toISOString(),
      __proto__: { polluted: true }
    });

    const file = new File([jsonWithPrototypePollution], 'pollution.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    // Change title to match the JSON title instead of filename
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // Should process normally without prototype pollution
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test',
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: 'Question',
            answer: 'Answer'
          })
        ])
      }));
    });
  });

  test('safely handles CSV with XSS attempt', async () => {
    const csvWithXSS = 'Question,Answer\n"<script>alert(1)</script>Question","Answer"';

    const file = new File([csvWithXSS], 'xss.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // Content should be stored as-is (React will handle escaping)
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: '<script>alert(1)</script>Question'
          })
        ])
      }));
    });
  });

  test('safely handles JSON with extremely long strings', async () => {
    const longString = 'A'.repeat(10000);
    const jsonWithLongString = JSON.stringify({
      title: longString,
      source: longString,
      cards: [
        { id: '1', question: longString, answer: longString }
      ],
      createdAt: new Date().toISOString()
    });

    const file = new File([jsonWithLongString], 'long.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Flashcard Details')).toBeInTheDocument();
    });

    // Change title to match the JSON title instead of filename
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: longString } });

    const confirmButton = screen.getByRole('button', { name: 'Import Flashcards' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // Should handle long strings without crashing
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: longString,
        cards: expect.arrayContaining([
          expect.objectContaining({
            question: longString,
            answer: longString
          })
        ])
      }));
    });
  });

  test('mock mode toggle is hidden in import modes', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Mock mode toggle should be visible in URL mode
    expect(screen.getByText('🚀 Fast Mock Mode')).toBeInTheDocument();

    // Switch to import JSON mode
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    // Mock mode toggle should not be visible
    expect(screen.queryByText('🚀 Fast Mock Mode')).not.toBeInTheDocument();
  });

  test('generate button is hidden in import modes', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />
    );

    // Generate button should be visible in URL mode
    expect(screen.getByRole('button', { name: 'Generate Flashcards' })).toBeInTheDocument();

    // Switch to import JSON mode
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    // Generate button should not be visible
    expect(screen.queryByRole('button', { name: 'Generate Flashcards' })).not.toBeInTheDocument();
  });
});
