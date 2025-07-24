import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let pushPath = '';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: (path: string) => {
        pushPath = path;
      },
    }),
  };
});

describe('StartPage', () => {
  it('invalid email blocks submit', async () => {
    const { default: StartPage } = await import('../app/start/page');
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response('{}', { status: 201 }))
    ) as any;
    render(<StartPage />);
    const input = screen.getByLabelText(/email/i);
    await userEvent.type(input, 'bad-email');
    await userEvent.click(screen.getByLabelText(/i agree/i));
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
  });

  it('valid email redirects to /scan', async () => {
    const { default: StartPage } = await import('../app/start/page');
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response('{}', { status: 201 }))
    ) as any;
    render(<StartPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.click(screen.getByLabelText(/i agree/i));
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(pushPath).toBe('/scan');
  });
});
