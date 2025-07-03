import React, { useState } from 'react';

import { FlashcardSet } from '../types';
import '../styles/FlashcardViewer.css';

interface FlashcardViewerProps {
  flashcardSet: FlashcardSet;
  onReset: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ flashcardSet, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const handleNext = () => {
    if (currentIndex < flashcardSet.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const exportAsCSV = () => {
    const csvContent = [
      ['Question', 'Answer'],
      ...flashcardSet.cards.map((card) => [card.question, card.answer]),
    ]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${flashcardSet.title.replace(/\s+/g, '_')}_flashcards.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsJSON = () => {
    const jsonContent = JSON.stringify(flashcardSet, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${flashcardSet.title.replace(/\s+/g, '_')}_flashcards.json`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle empty flashcard sets
  const hasCards = flashcardSet.cards && flashcardSet.cards.length > 0;
  const currentCard = hasCards ? flashcardSet.cards[currentIndex] : null;

  return (
    <div className="flashcard-viewer">
      <div className="flashcard-header">
        <h2>{flashcardSet.title}</h2>
        <p className="source">
          Source:
          {flashcardSet.source}
        </p>
        <p className="card-count">
          {flashcardSet.cards.length}
          {' '}
          flashcards generated
        </p>
      </div>

      <div className="view-controls">
        <button
          className={viewMode === 'cards' ? 'active' : ''}
          onClick={() => setViewMode('cards')}
        >
          Card View
        </button>
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
      </div>

      {viewMode === 'cards' ? (
        <div className="card-view">
          {hasCards ? (
            <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={handleFlip}>
              <div className="flashcard-inner">
                <div className="flashcard-front">
                  <p>{currentCard?.question}</p>
                  <small>Click to reveal answer</small>
                </div>
                <div className="flashcard-back">
                  <p>{currentCard?.answer}</p>
                  <small>Click to see question</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-flashcard">
              <p>No flashcards available</p>
            </div>
          )}

          <div className="card-navigation">
            <button
              onClick={handlePrevious}
              disabled={!hasCards || currentIndex === 0}
            >
              Previous
            </button>
            <span className="card-counter">
              {hasCards ? `${currentIndex + 1} / ${flashcardSet.cards.length}` : '0 / 0'}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasCards || currentIndex === flashcardSet.cards.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="list-view">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Answer</th>
              </tr>
            </thead>
            <tbody>
              {hasCards ? (
                flashcardSet.cards.map((card, index) => (
                  <tr key={card.id}>
                    <td>{index + 1}</td>
                    <td>{card.question}</td>
                    <td>{card.answer}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center' }}>No flashcards available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="action-buttons">
        <button onClick={exportAsCSV} className="export-btn">
          Export as CSV
        </button>
        <button onClick={exportAsJSON} className="export-btn">
          Export as JSON
        </button>
        <button onClick={onReset} className="reset-btn">
          Create New Flashcards
        </button>
      </div>
    </div>
  );
};

export default FlashcardViewer;
