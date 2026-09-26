import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { renderWithAnt } from '../../test/render-with-ant.js';
import { SchemaForm } from './schema-form.js';

describe('SchemaForm', () => {
  it('resynchronizes number-array text when another spec supplies the same field', async () => {
    const schema = {
      type: 'object',
      properties: {
        bins: { type: 'array', items: { type: 'number' } }
      }
    };
    const { rerender } = renderWithAnt(
      <SchemaForm schema={schema} value={{ bins: [1, 2] }} onChange={vi.fn()} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('1, 2');
    rerender(
      <SchemaForm schema={schema} value={{ bins: [3, 5] }} onChange={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveValue('3, 5')
    );
  });

  it('accepts and rejects exactly at a continuous exclusive lower bound', async () => {
    const parameter = z.number().positive();
    const schema = z.toJSONSchema(z.object({ windowSeconds: parameter }));
    const user = userEvent.setup();

    const Harness = () => {
      const [value, setValue] = useState<Record<string, unknown>>({});
      return (
        <>
          <SchemaForm schema={schema} value={value} onChange={setValue} />
          <output data-testid='value'>{JSON.stringify(value)}</output>
        </>
      );
    };

    const continuousView = renderWithAnt(<Harness />);
    const input = screen.getByRole('spinbutton');

    expect(parameter.safeParse(0).success).toBe(false);
    await user.type(input, '0');
    expect(screen.getByText('Must be greater than 0.')).toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('{}');

    await user.clear(input);
    expect(parameter.safeParse(0.005).success).toBe(true);
    await user.type(input, '0.005');
    await waitFor(() =>
      expect(screen.getByTestId('value')).toHaveTextContent(
        '{"windowSeconds":0.005}'
      )
    );
    expect(
      screen.queryByText('Must be greater than 0.')
    ).not.toBeInTheDocument();

    continuousView.unmount();
    const discreteParameter = z.number().positive().multipleOf(0.01);
    const discreteSchema = z.toJSONSchema(
      z.object({ windowSeconds: discreteParameter })
    );
    const DiscreteHarness = () => {
      const [value, setValue] = useState<Record<string, unknown>>({});
      return (
        <>
          <SchemaForm
            schema={discreteSchema}
            value={value}
            onChange={setValue}
          />
          <output data-testid='value'>{JSON.stringify(value)}</output>
        </>
      );
    };
    renderWithAnt(<DiscreteHarness />);

    expect(discreteParameter.safeParse(0.005).success).toBe(false);
    await user.type(screen.getByRole('spinbutton'), '0.005');
    expect(screen.getByText('Must be a multiple of 0.01.')).toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('{}');

    await user.clear(screen.getByRole('spinbutton'));
    expect(discreteParameter.safeParse(0.01).success).toBe(true);
    await user.type(screen.getByRole('spinbutton'), '0.01');
    await waitFor(() =>
      expect(screen.getByTestId('value')).toHaveTextContent(
        '{"windowSeconds":0.01}'
      )
    );
  });
});
