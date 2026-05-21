import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminClassForm } from '../../components/AdminClassForm';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;
const instructors = [{ id: 'i1', name: 'Jane Smith' }];

describe('AdminClassForm', () => {
  it('shows validation errors for empty required fields', async () => {
    const onSubmit = vi.fn();
    render(<AdminClassForm onSubmit={onSubmit} onCancel={vi.fn()} instructors={instructors} />, { wrapper });
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findAllByText('This field is required')).toBeTruthy();
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<AdminClassForm onSubmit={vi.fn()} onCancel={onCancel} instructors={instructors} />, { wrapper });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
