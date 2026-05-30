import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminClassForm } from '../../components/AdminClassForm';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;
const instructors = [{ id: 'i1', name: 'Jane Smith' }];
const locations = ['Studio A', 'Room B', 'Outdoor'];

describe('AdminClassForm', () => {
  it('shows validation errors for empty required fields', async () => {
    const onSubmit = vi.fn();
    render(<AdminClassForm onSubmit={onSubmit} onCancel={vi.fn()} instructors={instructors} locations={locations} />, { wrapper });
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findAllByText('This field is required')).toBeTruthy();
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<AdminClassForm onSubmit={vi.fn()} onCancel={onCancel} instructors={instructors} locations={locations} />, { wrapper });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows Duration field and no End Time field', () => {
    render(<AdminClassForm onSubmit={vi.fn()} onCancel={vi.fn()} instructors={instructors} locations={locations} />, { wrapper });
    expect(screen.getByText('Duration (minutes)')).toBeInTheDocument();
    expect(screen.queryByText('End Time')).not.toBeInTheDocument();
  });

  it('renders location as a dropdown with provided options', () => {
    render(<AdminClassForm onSubmit={vi.fn()} onCancel={vi.fn()} instructors={instructors} locations={locations} />, { wrapper });
    expect(screen.getByText('Studio A')).toBeInTheDocument();
    expect(screen.getByText('Room B')).toBeInTheDocument();
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
    // location input is a select, not a textbox
    expect(screen.queryByRole('textbox', { name: /location/i })).not.toBeInTheDocument();
  });

  it('computes endTime from startTime + duration when submitted', () => {
    const onSubmit = vi.fn();
    render(<AdminClassForm onSubmit={onSubmit} onCancel={vi.fn()} instructors={instructors} locations={locations} />, { wrapper });

    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[0], { target: { value: 'Yoga' } }); // title

    // instructor is the first combobox; time select is the second; location select is the third
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'i1' } });
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'Studio A' } });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-12-01' } });

    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '10:00' } });

    const numbers = screen.getAllByRole('spinbutton');
    fireEvent.change(numbers[0], { target: { value: '90' } }); // duration
    fireEvent.change(numbers[1], { target: { value: '10' } }); // capacity
    fireEvent.change(numbers[2], { target: { value: '20' } }); // price

    fireEvent.click(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalled();
    const arg = onSubmit.mock.calls[0][0];
    const durationMs = new Date(arg.endTime).getTime() - new Date(arg.startTime).getTime();
    expect(durationMs).toBe(90 * 60 * 1000);
  });

  it('hides recurrence end date when recurring is unchecked', () => {
    render(<AdminClassForm onSubmit={vi.fn()} onCancel={vi.fn()} instructors={instructors} locations={locations} />, { wrapper });
    expect(screen.queryByText('End date (optional)')).not.toBeInTheDocument();
  });

  it('shows recurrence end date when recurring is checked', () => {
    render(<AdminClassForm onSubmit={vi.fn()} onCancel={vi.fn()} instructors={instructors} locations={locations} />, { wrapper });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('End date (optional)')).toBeInTheDocument();
  });

  it('pre-fills duration from initial startTime and endTime', () => {
    render(
      <AdminClassForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        instructors={instructors}
        locations={locations}
        initial={{
          startTime: '2026-12-01T10:00:00.000Z',
          endTime: '2026-12-01T11:30:00.000Z',
        }}
      />,
      { wrapper }
    );
    const durationInput = screen.getAllByRole('spinbutton')[0];
    expect((durationInput as HTMLInputElement).value).toBe('90');
  });
});
