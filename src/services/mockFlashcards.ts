import { Flashcard } from '../types';

export const mockFlashcards: Array<Omit<Flashcard, 'id'>> = [
  {
    question: 'What is a flashcard?',
    answer: 'A card containing a small amount of information, held up for students to see, as an aid to learning.',
  },
  {
    question: 'What is spaced repetition?',
    answer: 'A learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.',
  },
  {
    question: 'What is active recall?',
    answer: 'A learning principle which involves actively stimulating memory during the learning process.',
  },
  {
    question: 'How do flashcards help with learning?',
    answer: 'They promote active recall and spaced repetition, two powerful learning techniques.',
  },
  {
    question: 'What makes an effective flashcard?',
    answer: 'Simple questions, clear answers, and focusing on one concept per card.',
  },
];
