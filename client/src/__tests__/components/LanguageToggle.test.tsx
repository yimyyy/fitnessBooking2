import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LanguageToggle } from '../../components/LanguageToggle';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe('LanguageToggle', () => {
  it('shows FR when in English mode', () => {
    render(<LanguageToggle />, { wrapper });
    expect(screen.getByText('FR')).toBeInTheDocument();
  });

  it('switches to French on click', () => {
    render(<LanguageToggle />, { wrapper });
    fireEvent.click(screen.getByText('FR'));
    expect(screen.getByText('EN')).toBeInTheDocument();
  });
});
