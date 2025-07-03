import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import FlashcardViewer from '../../src/components/FlashcardViewer';
import { FlashcardSet } from '../../src/types';

// Mock URL.createObjectURL
URL.createObjectURL = jest.fn(() => 'mock-blob-url');

describe('FlashcardViewer Component', () => {
  const mockFlashcardSet: FlashcardSet = {
    title: 'Test Flashcards',
    source: 'Test Source',
    cards: [
      { id: '1', question: 'Question 1', answer: 'Answer 1' },
      { id: '2', question: 'Question 2', answer: 'Answer 2' },
      { id: '3', question: 'Question 3', answer: 'Answer 3' },
    ],
    createdAt: new Date(),
  };

  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders flashcard set title and source', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    expect(screen.getByText('Test Flashcards')).toBeInTheDocument();
    expect(screen.getByText('Source: Test Source')).toBeInTheDocument();
    expect(screen.getByText('3 flashcards generated')).toBeInTheDocument();
  });

  test('displays first card by default in card view', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Click to reveal answer')).toBeInTheDocument();

    const answerElement = screen.queryByText('Answer 1');
    if (answerElement) {
      expect(answerElement.closest('.flashcard-back')).toBeTruthy();
    }
  });

  test('flips card when clicked', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const card = screen.getByText('Question 1').closest('.flashcard');
    fireEvent.click(card!);

    const frontElement = screen.queryByText('Question 1');
    if (frontElement) {
      expect(frontElement.closest('.flashcard-front')).toBeTruthy();
    }

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Click to see question')).toBeInTheDocument();
  });

  test('navigates to next card', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);

    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
  });

  test('navigates to previous card', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);

    const prevButton = screen.getByRole('button', { name: 'Previous' });
    fireEvent.click(prevButton);

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.queryByText('Question 2')).not.toBeInTheDocument();
  });

  test('switches to list view', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const listViewButton = screen.getByRole('button', { name: 'List View' });
    fireEvent.click(listViewButton);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();
    expect(screen.getByText('Question 3')).toBeInTheDocument();
    expect(screen.getByText('Answer 3')).toBeInTheDocument();
  });

  test('calls onReset when reset button is clicked', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const resetButton = screen.getByRole('button', { name: 'Create New Flashcards' });
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  test('renders action buttons section with export and reset buttons', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const actionButtonsSection = screen.getByRole('button', { name: 'Export as CSV' }).closest('.action-buttons');
    expect(actionButtonsSection).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export as JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create New Flashcards' })).toBeInTheDocument();
  });

  test('renders CSV export button', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const exportCSVButton = screen.getByRole('button', { name: 'Export as CSV' });
    expect(exportCSVButton).toBeInTheDocument();
    expect(exportCSVButton).toHaveClass('export-btn');
  });

  test('renders JSON export button', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const exportJSONButton = screen.getByRole('button', { name: 'Export as JSON' });
    expect(exportJSONButton).toBeInTheDocument();
    expect(exportJSONButton).toHaveClass('export-btn');
  });

  test('exports flashcards as CSV when CSV button is clicked', () => {
    // Setup spies for DOM methods
    const createElementSpy = jest.spyOn(document, 'createElement');
    const appendChildSpy = jest.spyOn(document.body, 'appendChild');
    const removeChildSpy = jest.spyOn(document.body, 'removeChild');

    // Mock Blob constructor for this test only
    const originalBlob = global.Blob;
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
    }));

    // Render component and click export button
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);
    const exportCSVButton = screen.getByRole('button', { name: 'Export as CSV' });
    fireEvent.click(exportCSVButton);

    // Verify Blob was created with correct CSV content
    expect(global.Blob).toHaveBeenCalledWith(
      [
        '"Question","Answer"\n"Question 1","Answer 1"\n"Question 2","Answer 2"\n"Question 3","Answer 3"'
      ],
      { type: 'text/csv;charset=utf-8;' }
    );

    // Verify URL.createObjectURL was called
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Verify link element was created
    expect(createElementSpy).toHaveBeenCalledWith('a');

    // Verify DOM manipulation occurred
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    // Clean up spies and mocks
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    global.Blob = originalBlob;
  });
  
  test('exports flashcards as JSON when JSON button is clicked', () => {
    // Setup spies for DOM methods
    const createElementSpy = jest.spyOn(document, 'createElement');
    const appendChildSpy = jest.spyOn(document.body, 'appendChild');
    const removeChildSpy = jest.spyOn(document.body, 'removeChild');

    // Mock Blob constructor for this test only
    const originalBlob = global.Blob;
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
    }));

    // Render component and click export button
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);
    const exportJSONButton = screen.getByRole('button', { name: 'Export as JSON' });
    fireEvent.click(exportJSONButton);

    // Expected JSON content
    const expectedJSON = JSON.stringify(mockFlashcardSet, null, 2);

    // Verify Blob was created with correct JSON content
    expect(global.Blob).toHaveBeenCalledWith(
      [expectedJSON],
      { type: 'application/json' }
    );

    // Verify URL.createObjectURL was called
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Verify link element was created
    expect(createElementSpy).toHaveBeenCalledWith('a');

    // Verify DOM manipulation occurred
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    // Clean up spies and mocks
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    global.Blob = originalBlob;
  });

  test('handles special characters in CSV export', () => {
    // Create a flashcard set with special characters that need escaping in CSV
    const specialCharFlashcardSet: FlashcardSet = {
      title: 'Special Characters',
      source: 'Test',
      cards: [
        { id: '1', question: 'Question with "quotes"', answer: 'Answer with, comma' },
        { id: '2', question: 'Line\nbreak', answer: 'Tab\tcharacter' },
      ],
      createdAt: new Date(),
    };

    // Mock Blob constructor for this test only
    const originalBlob = global.Blob;
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
    }));

    // Render component and click export button
    render(<FlashcardViewer flashcardSet={specialCharFlashcardSet} onReset={mockOnReset} />);
    const exportCSVButton = screen.getByRole('button', { name: 'Export as CSV' });
    fireEvent.click(exportCSVButton);

    // Verify Blob was created with properly escaped content
    expect(global.Blob).toHaveBeenCalledWith(
      [
        '"Question","Answer"\n"Question with ""quotes""","Answer with, comma"\n"Line\nbreak","Tab\tcharacter"'
      ],
      { type: 'text/csv;charset=utf-8;' }
    );

    // Clean up mocks
    global.Blob = originalBlob;
  });

  test('disables previous button on first card', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    const prevButton = screen.getByRole('button', { name: 'Previous' });
    expect(prevButton).toBeDisabled();
  });

  test('disables next button on last card', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    // Navigate to the last card
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(nextButton).toBeDisabled();
  });

  test('shows correct card counter', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  test('switches to card view from list view', () => {
    render(<FlashcardViewer flashcardSet={mockFlashcardSet} onReset={mockOnReset} />);

    // First switch to list view
    const listViewButton = screen.getByRole('button', { name: 'List View' });
    fireEvent.click(listViewButton);

    // Then switch back to card view
    const cardViewButton = screen.getByRole('button', { name: 'Card View' });
    fireEvent.click(cardViewButton);

    // Check that we're back in card view
    expect(screen.getByText('Click to reveal answer')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('handles edge case with empty flashcard set', () => {
    const emptyFlashcardSet: FlashcardSet = {
      title: 'Empty Set',
      source: 'Test',
      cards: [],
      createdAt: new Date(),
    };

    render(<FlashcardViewer flashcardSet={emptyFlashcardSet} onReset={mockOnReset} />);

    expect(screen.getByText('Empty Set')).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.queryByText('No flashcards available')).toBeInTheDocument();
  });
});
