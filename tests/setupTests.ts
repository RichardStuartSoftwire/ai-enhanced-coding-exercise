import '@testing-library/jest-dom';
import 'openai/shims/node';

global.fetch = jest.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

if (typeof document.createRange === 'undefined') {
  document.createRange = () => ({
    setStart: jest.fn(),
    setEnd: jest.fn(),
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
    createContextualFragment: (str: string) => {
      const div = document.createElement('div');
      div.innerHTML = str;
      return div.children[0];
    },
  }) as unknown as Range;
}

if (typeof window.document.addEventListener !== 'function') {
  Object.defineProperty(window.document, 'addEventListener', {
    value: jest.fn(),
    writable: true,
  });
}
