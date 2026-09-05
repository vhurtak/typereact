import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProductTable } from '../components/ProductTable.js';

describe('ProductTable', () => {
  it('resets to page 1 when the filter changes', async () => {
    const user = userEvent.setup();
    render(<ProductTable />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Filter by name'), 'nova');
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });

  it('exposes sort state through aria-sort', async () => {
    const user = userEvent.setup();
    render(<ProductTable />);

    const header = screen.getByRole('columnheader', { name: /Name/ });
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });
});
