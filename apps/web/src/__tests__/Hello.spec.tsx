import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Hello } from '../components/Hello';
import { HelloModel } from '../models/HelloModel';

describe('<Hello />', () => {
  it('renders the greeting returned by the GraphQL fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue({ hello: 'Hallo Test' });
    const model = new HelloModel(fetcher);

    render(<Hello model={model} />);

    expect(screen.getByRole('status')).toHaveTextContent('Lade');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hallo Test');
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('renders the error message when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const model = new HelloModel(fetcher);

    render(<Hello model={model} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('boom');
    });
  });
});
