import React, { useState, useEffect } from 'react';
import '../styles/MockModeToggle.css';

interface MockModeToggleProps {
  onChange: (useMock: boolean) => void;
}

export const MockModeToggle: React.FC<MockModeToggleProps> = ({ onChange }) => {
  const [useMock, setUseMock] = useState<boolean>(true);

  useEffect(() => {
    const savedSetting = localStorage.getItem('use_mock_mode');
    if (savedSetting !== null && savedSetting !== '') {
      const savedUseMock = savedSetting === 'true';
      setUseMock(savedUseMock);
      onChange(savedUseMock);
    } else {
      onChange(true);
    }
  }, [onChange]);

  const handleToggle = (): void => {
    const newValue = !useMock;
    setUseMock(newValue);
    localStorage.setItem('use_mock_mode', String(newValue));
    onChange(newValue);
  };

  return (
    <div className="mock-mode-toggle">
      <label className="toggle-switch" htmlFor="mock-mode-toggle">
        <span className="visually-hidden">Toggle between mock and real LLM mode</span>
        <input
          id="mock-mode-toggle"
          type="checkbox"
          checked={useMock}
          onChange={handleToggle}
        />
        <span className="toggle-slider" />
      </label>
      <span className="toggle-label">
        {useMock === true ? '🚀 Fast Mock Mode' : '🤖 Real LLM Mode'}
      </span>
      <div className="toggle-tooltip">
        {useMock === true
          ? 'Using mock responses (fast, no API calls)'
          : 'Using real AI calls (will be slower)'}
      </div>
    </div>
  );
};
