import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { MockModeToggle } from '../../src/components/MockModeToggle';

describe('MockModeToggle Component', () => {
  const mockOnChange = jest.fn();

  // Mock localStorage
  const localStorageMock = ((): Record<string, jest.Mock> => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };
  })();

  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test('renders with default state (mock mode enabled)', () => {
    render(<MockModeToggle onChange={mockOnChange} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(true);

    expect(screen.getByText('🚀 Fast Mock Mode')).toBeInTheDocument();
    expect(screen.getByText('Using mock responses (fast, no API calls)')).toBeInTheDocument();
  });

  test('loads saved preference from localStorage', () => {
    // Set localStorage value before rendering
    localStorageMock.getItem.mockReturnValueOnce('false');

    render(<MockModeToggle onChange={mockOnChange} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox');
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText('🤖 Real LLM Mode')).toBeInTheDocument();
  });

  test('toggles state when clicked', () => {
    render(<MockModeToggle onChange={mockOnChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Should now be unchecked (real API mode)
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('🤖 Real LLM Mode')).toBeInTheDocument();
    expect(screen.getByText('Using real AI calls (will be slower)')).toBeInTheDocument();

    // Check that onChange was called with the new value
    expect(mockOnChange).toHaveBeenCalledWith(false);

    // Check that localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('use_mock_mode', 'false');
  });

  test('toggles back to mock mode when clicked again', () => {
    render(<MockModeToggle onChange={mockOnChange} />);

    const checkbox = screen.getByRole('checkbox');

    // First click to switch to real API mode
    fireEvent.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith(false);

    // Second click to switch back to mock mode
    fireEvent.click(checkbox);

    // Should now be checked again (mock mode)
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('🚀 Fast Mock Mode')).toBeInTheDocument();

    // Check that onChange was called with the new value
    expect(mockOnChange).toHaveBeenCalledWith(true);

    // Check that localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('use_mock_mode', 'true');
  });

  test('renders toggle switch with correct styling', () => {
    render(<MockModeToggle onChange={mockOnChange} />);

    const toggleSwitch = screen.getByRole('checkbox').closest('label');
    expect(toggleSwitch).toHaveClass('toggle-switch');

    const slider = document.querySelector('.toggle-slider');
    expect(slider).toBeInTheDocument();
  });
});
