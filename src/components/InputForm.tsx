import React, { useState, useEffect } from 'react';
import { extractFlashcards } from '../services/llmService';
import { fetchWikipediaContent } from '../services/wikipediaService';
import { FlashcardSet, Flashcard } from '../types';
import { getLLMConfig } from '../config';
import { MockModeToggle } from './MockModeToggle';
import '../styles/InputForm.css';

interface InputFormProps {
  setFlashcardSet: React.Dispatch<React.SetStateAction<FlashcardSet | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const InputForm: React.FC<InputFormProps> = ({ setFlashcardSet, setLoading, setError }) => {
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'import-json' | 'import-csv'>('url');
  const [input, setInput] = useState('');
  const [useMockMode, setUseMockMode] = useState(true);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataTitle, setMetadataTitle] = useState('');
  const [metadataSource, setMetadataSource] = useState('');
  const [parsedFlashcards, setParsedFlashcards] = useState<{ cards: Flashcard[], defaultTitle: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSetting = localStorage.getItem('use_mock_mode');
    if (savedSetting) {
      setUseMockMode(savedSetting === 'true');
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (inputMode === 'import-json' || inputMode === 'import-csv') {
      // Import mode is handled separately via file input
      return;
    }

    if (!input.trim()) {
      setError('Please enter a Wikipedia URL or text');
      return;
    }

    const config = getLLMConfig();

    if (
      !useMockMode
      && (config.defaultApiKey === undefined || config.defaultApiKey === '' || config.defaultApiKey.trim() === '')
    ) {
      setError('Please set your API key in LLM Settings');
      return;
    }

    setLoading(true);

    try {
      let content = input;
      let source = 'Custom text';

      if (inputMode === 'url') {
        if (!isValidWikipediaUrl(input)) {
          setError('Please enter a valid Wikipedia URL');
          setLoading(false);
          return;
        }

        const wikiContent = await fetchWikipediaContent(input);
        content = wikiContent.content;
        source = input;
      }

      const flashcards = await extractFlashcards(content, undefined, useMockMode);

      setFlashcardSet({
        title: inputMode === 'url' ? extractTitleFromUrl(input) : 'Custom Text Flashcards',
        source: source,
        cards: flashcards,
        createdAt: new Date()
      });
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const isValidWikipediaUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('wikipedia.org') && parsedUrl.pathname.length > 1;
    } catch {
      return false;
    }
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart.replace(/_/g, ' ');
    } catch {
      return 'Wikipedia Flashcards';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const fileContent = await readFile(file);
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

      if (inputMode === 'import-json') {
        const jsonData = JSON.parse(fileContent);
        
        // Validate JSON structure
        if (!jsonData.cards || !Array.isArray(jsonData.cards)) {
          throw new Error('Invalid JSON file format: missing or invalid cards array');
        }

        // Validate each card has required fields
        for (const card of jsonData.cards) {
          if (!card.question || !card.answer) {
            throw new Error('Invalid JSON file format: cards must have question and answer fields');
          }
        }

        // Generate IDs if missing
        const cardsWithIds = jsonData.cards.map((card: Partial<Flashcard>, index: number) => ({
          id: card.id || `imported-${index}`,
          question: card.question || '',
          answer: card.answer || ''
        }));

        setParsedFlashcards({
          cards: cardsWithIds,
          defaultTitle: jsonData.title || fileName
        });
      } else if (inputMode === 'import-csv') {
        const cards = parseCSV(fileContent);
        
        if (cards.length === 0) {
          throw new Error('CSV file is empty or has no valid data');
        }

        setParsedFlashcards({
          cards,
          defaultTitle: fileName
        });
      }

      // Show metadata dialog with defaults
      setMetadataTitle(parsedFlashcards?.defaultTitle || fileName);
      setMetadataSource('Uploaded file');
      setShowMetadataDialog(true);

    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseCSV = (csvContent: string): Flashcard[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must have header and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Validate headers
    if (!headers.includes('Question') || !headers.includes('Answer')) {
      throw new Error('CSV file must have "Question" and "Answer" headers');
    }

    const questionIndex = headers.indexOf('Question');
    const answerIndex = headers.indexOf('Answer');

    const cards = lines.slice(1).map((line, index) => {
      const values = parseCSVLine(line);

      if (values.length <= Math.max(questionIndex, answerIndex)) {
        throw new Error(`Invalid CSV format on line ${index + 2}`);
      }

      return {
        id: `imported-${index}`,
        question: values[questionIndex] || '',
        answer: values[answerIndex] || ''
      };
    }).filter(card => card.question && card.answer);

    return cards;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const handleMetadataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parsedFlashcards) return;

    setFlashcardSet({
      title: metadataTitle || parsedFlashcards.defaultTitle,
      source: metadataSource || 'Uploaded file',
      cards: parsedFlashcards.cards,
      createdAt: new Date()
    });

    setShowMetadataDialog(false);
    setParsedFlashcards(null);
    setMetadataTitle('');
    setMetadataSource('');
  };

  const handleMetadataCancel = () => {
    setShowMetadataDialog(false);
    setParsedFlashcards(null);
    setMetadataTitle('');
    setMetadataSource('');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="input-form-container">
      <form onSubmit={handleSubmit}>
        <div className="input-type-selector">
          <button
            type="button"
            className={inputMode === 'url' ? 'active' : ''}
            onClick={() => setInputMode('url')}
          >
            Wikipedia URL
          </button>
          <button
            type="button"
            className={inputMode === 'text' ? 'active' : ''}
            onClick={() => setInputMode('text')}
          >
            Custom Text
          </button>
          <button
            type="button"
            className={inputMode === 'import-json' ? 'active' : ''}
            onClick={() => setInputMode('import-json')}
          >
            Import JSON
          </button>
          <button
            type="button"
            className={inputMode === 'import-csv' ? 'active' : ''}
            onClick={() => setInputMode('import-csv')}
          >
            Import CSV
          </button>
        </div>

        {(inputMode === 'url' || inputMode === 'text') && (
          <div className="form-group">
            <label htmlFor="input">
              {inputMode === 'url' ? 'Wikipedia URL' : 'Text to extract flashcards from'}
            </label>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                inputMode === 'url'
                  ? 'https://en.wikipedia.org/wiki/Artificial_intelligence'
                  : 'Paste your text here...'
              }
              rows={inputMode === 'url' ? 1 : 10}
            />
          </div>
        )}

        {(inputMode === 'import-json' || inputMode === 'import-csv') && (
          <div className="form-group">
            <label htmlFor="file-input">
              {inputMode === 'import-json' ? 'Upload JSON file' : 'Upload CSV file'}
            </label>
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept={inputMode === 'import-json' ? '.json' : '.csv'}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="file-upload-button"
              onClick={triggerFileInput}
            >
              {inputMode === 'import-json' ? 'Select JSON File' : 'Select CSV File'}
            </button>
            <small>
              {inputMode === 'import-json' 
                ? 'Upload a JSON file exported from this application' 
                : 'Upload a CSV file with "Question" and "Answer" headers'}
            </small>
          </div>
        )}

        {inputMode !== 'import-json' && inputMode !== 'import-csv' && (
          <>
            <MockModeToggle onChange={setUseMockMode} />
            <button className="submit-button" type="submit">Generate Flashcards</button>
          </>
        )}
      </form>

      {showMetadataDialog && (
        <div className="metadata-dialog-overlay">
          <div className="metadata-dialog">
            <h3>Flashcard Details</h3>
            <form onSubmit={handleMetadataSubmit}>
              <div className="form-group">
                <label htmlFor="metadata-title">Title</label>
                <input
                  id="metadata-title"
                  type="text"
                  value={metadataTitle}
                  onChange={(e) => setMetadataTitle(e.target.value)}
                  placeholder="Enter flashcard set title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="metadata-source">Source</label>
                <input
                  id="metadata-source"
                  type="text"
                  value={metadataSource}
                  onChange={(e) => setMetadataSource(e.target.value)}
                  placeholder="Enter source"
                />
              </div>
              <div className="dialog-buttons">
                <button type="button" className="cancel-button" onClick={handleMetadataCancel}>
                  Cancel
                </button>
                <button type="submit" className="confirm-button">
                  Import Flashcards
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputForm;
