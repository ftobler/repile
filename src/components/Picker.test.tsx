import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Picker } from './Picker';

const OPTIONS = [
  { value: 1, label: 'Small' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Large' },
  { value: 4, label: 'Lots' },
];

function setup(initial = 2) {
  const onChange = vi.fn();
  function Host() {
    const [value, setValue] = useState(initial);
    return (
      <>
        <Picker
          label="Size"
          title="Pick a size"
          icon={<svg />}
          value={value}
          options={OPTIONS}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
        <button type="button">Elsewhere</button>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Host />);
  const trigger = screen.getByRole('combobox', { name: 'Size' });
  return { user, onChange, trigger };
}

const listbox = () => screen.getByRole('listbox', { name: 'Size' });
const active = (trigger: HTMLElement) => {
  const id = trigger.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.textContent : null;
};

describe('Picker', () => {
  it('is a button showing the current option, with no native select', () => {
    const { trigger } = setup();
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveTextContent('Medium');
    expect(trigger).toHaveAttribute('title', 'Pick a size');
    expect(document.querySelector('select')).toBeNull();
  });

  it('wires up the listbox popup aria attributes', async () => {
    const { user, trigger } = setup();
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).not.toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(listbox().id).toBe(trigger.getAttribute('aria-controls'));
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Small', 'Medium', 'Large', 'Lots']);
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
    expect(active(trigger)).toBe('Medium');
  });

  it('opens on click and selects an option by clicking it', async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Large' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(3);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Large');
    expect(trigger).toHaveFocus();
  });

  it('closes again when the trigger is clicked twice', async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'])('opens from the keyboard with %s', async (key) => {
    const { user, onChange, trigger } = setup();
    trigger.focus();
    await user.keyboard(key);
    expect(listbox()).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(active(trigger)).toBe('Medium');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves the active option with the arrow keys, Home and End, and selects with Enter', async () => {
    const { user, onChange, trigger } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    expect(active(trigger)).toBe('Large');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(active(trigger)).toBe('Lots');
    await user.keyboard('{Home}');
    expect(active(trigger)).toBe('Small');
    await user.keyboard('{ArrowUp}');
    expect(active(trigger)).toBe('Small');
    await user.keyboard('{End}{ArrowUp}');
    expect(active(trigger)).toBe('Large');
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(3);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Large');
    expect(trigger).toHaveFocus();
  });

  it('selects with Space', async () => {
    const { user, onChange, trigger } = setup();
    trigger.focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not call onChange when the current option is picked again', async () => {
    const { user, onChange, trigger } = setup();
    trigger.focus();
    await user.keyboard('{Enter}{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('jumps to options by their first letter', async () => {
    const { user, trigger } = setup();
    trigger.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('l');
    expect(active(trigger)).toBe('Large');
    await user.keyboard('l');
    expect(active(trigger)).toBe('Lots');
    await user.keyboard('l');
    expect(active(trigger)).toBe('Large');
  });

  it('closes on Escape without changing anything and keeps focus on the trigger', async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-activedescendant');
    expect(trigger).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes on Tab and lets focus move on', async () => {
    const { user, onChange, trigger } = setup();
    trigger.focus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes when clicking outside', async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('highlights the option under the pointer', async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await user.hover(screen.getByRole('option', { name: 'Lots' }));
    expect(active(trigger)).toBe('Lots');
  });
});
