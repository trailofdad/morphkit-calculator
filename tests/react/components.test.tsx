// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { buildAlleleList, calcPairing, foldAndSortOutcomes, type SelectionTrait } from '../../src';
import { GeneticsChips, OutcomeList, TraitPicker, useCalculator } from '../../src/react';
import { REAL_DICT } from '../helpers';

describe('<OutcomeList>', () => {
  const outcomes = foldAndSortOutcomes(
    calcPairing(
      { sex: 'Male', genotype: [{ locusId: 'spider_complex', alleles: ['spider', 'normal'] }] },
      { sex: 'Female', genotype: [{ locusId: 'spider_complex', alleles: ['spider', 'normal'] }] },
      REAL_DICT,
    ),
  );

  it('flags the lethal outcome', () => {
    render(<OutcomeList outcomes={outcomes} dictionary={REAL_DICT} />);
    const lethal = screen.getAllByRole('listitem').filter((li) => li.dataset.lethal);
    expect(lethal).toHaveLength(1);
    expect(within(lethal[0]!).getByText('Lethal')).toBeInTheDocument();
  });

  it('renders custom actions and combo wrappers', () => {
    const bumblebee = foldAndSortOutcomes(
      calcPairing(
        { sex: 'Male', genotype: [{ locusId: 'pastel_locus', alleles: ['pastel', 'normal'] }] },
        { sex: 'Female', genotype: [{ locusId: 'spider_complex', alleles: ['spider', 'normal'] }] },
        REAL_DICT,
      ),
    );
    render(
      <OutcomeList
        outcomes={bumblebee}
        dictionary={REAL_DICT}
        renderActions={(o) => <button>Goal {o.key}</button>}
        renderCombo={({ name, description }) => (
          <span data-testid="combo">
            {name}: {description}
          </span>
        )}
      />,
    );
    expect(screen.getByTestId('combo')).toHaveTextContent('Bumblebee: Pastel + Spider');
    expect(screen.getAllByRole('button', { name: /^Goal/ })).toHaveLength(4);
  });

  it('shows an empty label', () => {
    render(<OutcomeList outcomes={[]} dictionary={REAL_DICT} emptyLabel="Nothing yet" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });
});

describe('<GeneticsChips>', () => {
  it('labels, tags and tints stored genetics, with overflow', () => {
    render(
      <GeneticsChips
        dictionary={REAL_DICT}
        max={2}
        genetics={[
          { locusId: 'yellowbelly_complex', alleles: ['yellowbelly', 'asphalt'] },
          { locusId: 'clown_complex', alleles: ['clown', 'normal'] },
          { locusId: 'pastel_locus', alleles: ['pastel', 'pastel'] },
        ]}
      />,
    );
    expect(screen.getByText('Freeway')).toHaveAttribute('data-inheritance', 'incomplete_dominant');
    expect(screen.getByText('Clown')).toHaveTextContent('ClownHET');
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});

describe('<TraitPicker> standalone', () => {
  function Harness({ customZyg = false }: { customZyg?: boolean }) {
    const [traits, setTraits] = useState<SelectionTrait[]>([]);
    return (
      <TraitPicker
        traits={traits}
        suggestions={buildAlleleList(REAL_DICT)}
        dictionary={REAL_DICT}
        onAdd={(s) =>
          setTraits((t) => [
            ...t,
            { name: s.name, locusId: s.locusId, alleleId: s.alleleId, zygosity: 'het50' },
          ])
        }
        onRemove={(i) => setTraits((t) => t.filter((_, j) => j !== i))}
        onSetZygosity={(i, z) =>
          setTraits((t) => t.map((x, j) => (j === i ? { ...x, zygosity: z } : x)))
        }
        carrierProbabilities={[0.66, 0.5]}
        onSetCarrierProbability={(i, p) =>
          setTraits((t) => t.map((x, j) => (j === i ? { ...x, carrierProbability: p } : x)))
        }
        classNames={{ input: 'my-input' }}
        {...(customZyg
          ? {
              renderZygosity: ({ label, value }) => <output aria-label={label}>{value}</output>,
            }
          : {})}
      />
    );
  }

  it('works without a calculator, with carrier choices and class overrides', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveClass('mkc-picker-input', 'my-input');
    await user.type(input, 'clown');
    await user.keyboard('{Enter}');
    const select = screen.getByRole('combobox', { name: /carrier probability/ });
    expect(select).toHaveValue('0.66');
    await user.selectOptions(select, '0.5');
    expect(select).toHaveValue('0.5');
  });

  it('accepts a custom zygosity control', async () => {
    const user = userEvent.setup();
    render(<Harness customZyg />);
    await user.type(screen.getByRole('combobox'), 'clown');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status', { name: /zygosity/ })).toHaveTextContent('het50');
  });

  it('closes the match list on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox'), 'pastel');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('useCalculator', () => {
  it('throws outside a provider', () => {
    function Orphan() {
      useCalculator();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/CalculatorProvider/);
  });
});
