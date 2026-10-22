// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Calculator, useCalculator } from '../../src/react';
import { REAL_DICT } from '../helpers';

const panel = (parent: 'sire' | 'dam'): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-parent="${parent}"]`)!;

/** Type into a parent's search and click the option whose name is exactly `name`. */
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  parent: 'sire' | 'dam',
  query: string,
  name: string,
): Promise<void> {
  const p = within(panel(parent));
  await user.type(p.getByRole('combobox'), query);
  const option = p.getAllByRole('option').find((o) => o.firstElementChild?.textContent === name);
  if (!option) throw new Error(`No option named ${name}`);
  await user.click(option);
}

const outcomeRows = (): string[] =>
  within(screen.getByRole('list', { name: 'Outcomes' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '');

describe('<Calculator>', () => {
  it('shows the idle prompt until a trait is added', () => {
    render(<Calculator dictionary={REAL_DICT} />);
    expect(screen.getByText(/Add traits to a parent/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /swap/i })).toBeDisabled();
  });

  it('Pastel × Spider shows a 25% Bumblebee', async () => {
    const user = userEvent.setup();
    render(<Calculator dictionary={REAL_DICT} />);
    await pick(user, 'sire', 'pastel', 'Pastel');
    await pick(user, 'dam', 'spider', 'Spider');

    expect(screen.getByText('4 possible')).toBeInTheDocument();
    const bumblebee = outcomeRows().find((r) => r.includes('Bumblebee'));
    expect(bumblebee).toContain('25%');
    // The combo explains itself on hover.
    expect(screen.getByTitle('Pastel + Spider')).toHaveTextContent('Bumblebee');
  });

  it('adds the active match with the keyboard and clears the search', async () => {
    const user = userEvent.setup();
    render(<Calculator dictionary={REAL_DICT} />);
    const input = within(panel('sire')).getByRole('combobox');
    await user.type(input, 'clown');
    const first = within(panel('sire')).getAllByRole('option')[0]!;
    expect(first).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('');
    expect(within(panel('sire')).getByRole('list', { name: 'Selected traits' })).toHaveTextContent(
      first.firstElementChild!.textContent!,
    );
  });

  it('switches a recessive between Visual / Het / 66%', async () => {
    const user = userEvent.setup();
    render(<Calculator dictionary={REAL_DICT} />);
    await pick(user, 'sire', 'clown', 'Clown');
    await pick(user, 'dam', 'clown', 'Clown');
    const sireZyg = within(panel('sire')).getByRole('radiogroup', { name: 'Clown zygosity' });
    await user.click(within(sireZyg).getByLabelText('Het'));
    const damZyg = within(panel('dam')).getByRole('radiogroup', { name: 'Clown zygosity' });
    await user.click(within(damZyg).getByLabelText('Het'));
    expect(outcomeRows().find((r) => r.startsWith('1 trait'))).toContain('25%');
    expect(screen.getByText(/66% Het/)).toBeInTheDocument();
  });

  it('pairs two alleles on one locus as a compound (Freeway)', async () => {
    const user = userEvent.setup();
    render(<Calculator dictionary={REAL_DICT} />);
    await pick(user, 'sire', 'yellowbelly', 'Yellowbelly');
    await pick(user, 'sire', 'asphalt', 'Asphalt');
    await pick(user, 'dam', 'yellowbelly', 'Yellowbelly');

    const sire = within(panel('sire'));
    expect(sire.getAllByText('Single copy (paired on this locus)')).toHaveLength(2);
    expect(sire.queryByRole('radiogroup')).not.toBeInTheDocument();
    for (const name of ['Ivory', 'Freeway', 'Yellowbelly', 'Asphalt']) {
      expect(outcomeRows().some((r) => r.includes(name) && r.includes('25%'))).toBe(true);
    }
  });

  it('offers male-/female-maker only for a sex-linked gene on the sire', async () => {
    const user = userEvent.setup();
    render(<Calculator dictionary={REAL_DICT} />);
    await pick(user, 'sire', 'banana', 'Banana / Coral Glow');
    await pick(user, 'dam', 'banana', 'Banana / Coral Glow');

    expect(within(panel('dam')).queryByRole('radiogroup', { name: /sex linkage/ })).toBeNull();
    const linkage = within(panel('sire')).getByRole('radiogroup', { name: /sex linkage/ });
    expect(within(linkage).getByLabelText('Male maker')).toBeChecked();

    // Banana × Banana het female. Male-maker: every son is Banana or Super, so
    // only daughters can be Normal.
    const normals = (): string[] => outcomeRows().filter((r) => r.startsWith('Normal'));
    expect(normals()).toHaveLength(1);
    expect(normals()[0]).toContain('♀ Female');

    // Female-maker flips it: every daughter is Banana or Super.
    await user.click(within(linkage).getByLabelText('Female maker'));
    expect(within(linkage).getByLabelText('Female maker')).toBeChecked();
    expect(normals()).toHaveLength(1);
    expect(normals()[0]).toContain('♂ Male');
  });

  it('swaps parents, removes and clears traits', async () => {
    const user = userEvent.setup();
    render(<Calculator dictionary={REAL_DICT} />);
    await pick(user, 'sire', 'pastel', 'Pastel');
    await user.click(screen.getByRole('button', { name: /swap/i }));
    expect(within(panel('sire')).getByText(/No traits yet/)).toBeInTheDocument();
    expect(within(panel('dam')).getByText('Pastel')).toBeInTheDocument();

    await user.click(within(panel('dam')).getByRole('button', { name: 'Remove Pastel' }));
    expect(screen.getByText(/Add traits to a parent/)).toBeInTheDocument();
  });

  it('reports state changes and exposes the controller to children', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function LoadButton() {
      const calc = useCalculator();
      return (
        <button
          type="button"
          onClick={() =>
            calc.loadGenetics('sire', [
              { locusId: 'clown_complex', alleles: ['clown', 'clown'] },
              { locusId: 'gone_locus', alleles: ['gone', 'normal'] },
            ])
          }
        >
          Load
        </button>
      );
    }
    render(
      <Calculator dictionary={REAL_DICT} onChange={onChange}>
        <LoadButton />
      </Calculator>,
    );
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Load' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(within(panel('sire')).getByText('Clown')).toBeInTheDocument();
    expect(within(panel('sire')).getByRole('status')).toHaveTextContent('gone_locus');
  });

  it('renders per-parent header actions', () => {
    render(<Calculator dictionary={REAL_DICT} parentActions={(p) => <button>Load {p}</button>} />);
    expect(within(panel('dam')).getByRole('button', { name: 'Load dam' })).toBeInTheDocument();
  });
});

describe('<Calculator> dictionary loading', () => {
  it('loads, fails with a retry, then recovers', async () => {
    const { resetDictionaryCache } = await import('../../src/react/use-dictionary');
    resetDictionaryCache();
    const user = userEvent.setup();
    let calls = 0;
    const fetchMock = (async () => {
      calls++;
      return calls === 1
        ? new Response('down', { status: 503 })
        : new Response(JSON.stringify(REAL_DICT));
    }) as unknown as typeof fetch;

    render(<Calculator dictionaryOptions={{ url: 'https://test/dict.json', fetch: fetchMock }} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('503');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(panel('sire')).toBeInTheDocument());
    expect(calls).toBe(2);
  });
});
