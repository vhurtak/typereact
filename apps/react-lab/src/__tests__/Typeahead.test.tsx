import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Typeahead } from '../components/Typeahead.js';

/**
 * How to test a debounced, async component without flaking:
 *   - drive the input with `userEvent` (real events, real React act())
 *   - assert on ROLES and user-visible text, never on internals
 *   - let `findBy*` do the waiting instead of hard-coded sleeps
 *
 * Note we use real timers here. Mixing fake timers with userEvent needs
 * `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` — a good detail
 * to mention if the interviewer asks why their test hangs.
 */
describe('Typeahead', () => {
  it('shows the idle hint before any input', () => {
    render(<Typeahead />);
    expect(screen.getByText('Start typing to search.')).toBeInTheDocument();
  });

  it('debounces, then renders results for the final query', async () => {
    const user = userEvent.setup();
    render(<Typeahead />);

    await user.type(screen.getByRole('combobox'), 'nova');

    // The last query wins even though shorter prefixes are slower in the mock API.
    const status = await screen.findByText(/result/i, {}, { timeout: 5000 });
    expect(status).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.textContent?.toLowerCase()).toContain('nova');
  }, 10_000);
});
