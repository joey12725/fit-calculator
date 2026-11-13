import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Calculator } from '../components/Calculator';

afterEach(cleanup);

describe('Calculator', () => {
  it('renders a recommendation for the default sample', () => {
    render(<Calculator />);
    expect(screen.getByTestId('size').textContent).toBe('30FF');
    expect(screen.getByText('Seamed full cup')).toBeTruthy();
  });

  it('switches cup scale', async () => {
    render(<Calculator />);
    await userEvent.click(screen.getByRole('button', { name: 'US' }));
    expect(screen.getByTestId('size').textContent).toBe('30H');
  });

  it('loads other samples', async () => {
    render(<Calculator />);
    await userEvent.click(screen.getByRole('button', { name: 'Sample C' }));
    expect(screen.getByTestId('size').textContent).toBe('36C');
  });

  it('converts values when the unit changes and keeps the same size', async () => {
    render(<Calculator />);
    await userEvent.click(screen.getByRole('button', { name: 'Sample A' }));
    await userEvent.click(screen.getByRole('button', { name: 'cm' }));
    expect((screen.getByLabelText(/Underbust/) as HTMLInputElement).value).toBe('79.4');
    expect(screen.getByTestId('size').textContent).toBe('32F');
  });

  it('explains invalid input instead of guessing', async () => {
    render(<Calculator />);
    const bust = screen.getByLabelText(/Bust, standing/);
    await userEvent.clear(bust);
    await userEvent.type(bust, '10');
    await userEvent.clear(screen.getByLabelText(/Bust, leaning/));
    expect(screen.getByRole('alert').textContent).toMatch(/bust must be larger than underbust/);
  });
});
