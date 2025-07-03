import { render, screen } from '@testing-library/react';
import React from 'react';

import App from '../../src/App';

jest.mock('../../src/components/InputForm', () => ({
  __esModule: true,
  default: (): JSX.Element => <div data-testid="mock-input-form">Mock Input Form</div>,
}));

jest.mock('../../src/components/FlashcardViewer', () => ({
  __esModule: true,
  default: (): JSX.Element => <div data-testid="mock-flashcard-viewer">Mock Flashcard Viewer</div>,
}));

describe('App Component', () => {
  test('renders header with title', (): void => {
    render(<App />);
    expect(screen.getByText('Flashcard Extractor')).toBeInTheDocument();
    expect(screen.getByText('Extract flashcards from Wikipedia articles or text')).toBeInTheDocument();
  });

  test('renders InputForm when no flashcards are present', () => {
    render(<App />);
    expect(screen.getByTestId('mock-input-form')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-flashcard-viewer')).not.toBeInTheDocument();
  });

  test('renders footer with current year', () => {
    render(<App />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(`© ${currentYear} Flashcard Extractor`)).toBeInTheDocument();
  });
});
