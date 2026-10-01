import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

interface Option {
  value: number;
  label: string;
}

interface Props {
  label: string;
  title: string;
  icon: ReactNode;
  value: number;
  options: readonly Option[];
  onChange: (value: number) => void;
}

const OPTION_HEIGHT = 32;
const LIST_CHROME = 14;
const GAP = 6;

/**
 * A toolbar dropdown drawn entirely by us (no native <select>), following the
 * WAI-ARIA select-only combobox pattern: focus stays on the trigger, the active
 * option is tracked with aria-activedescendant.
 */
export function Picker({ label, title, icon, value, options, onChange }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // set when a key already handled Enter/Space, so the button's synthetic click is ignored
  const keyHandled = useRef(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<'below' | 'above'>('below');

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[selectedIndex];

  const show = (index = selectedIndex) => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const needed = options.length * OPTION_HEIGHT + LIST_CHROME + GAP;
      const below = window.innerHeight - rect.bottom;
      setPlacement(below < needed && rect.top > below ? 'above' : 'below');
    }
    setActiveIndex(index);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const choose = (index: number) => {
    close();
    triggerRef.current?.focus();
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-opt-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, id]);

  const typeAhead = (char: string) => {
    const start = open ? activeIndex : selectedIndex;
    for (let step = 1; step <= options.length; step++) {
      const i = (start + step) % options.length;
      if (options[i].label.toLowerCase().startsWith(char)) return i;
    }
    return -1;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const last = options.length - 1;
    let handled = true;
    if (!open) {
      switch (e.key) {
        case 'Enter':
        case ' ':
          keyHandled.current = true;
          show();
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          show();
          break;
        case 'Home':
          show(0);
          break;
        case 'End':
          show(last);
          break;
        default: {
          const i = e.key.length === 1 && e.key !== ' ' ? typeAhead(e.key.toLowerCase()) : -1;
          if (i >= 0) show(i);
          else handled = false;
        }
      }
    } else {
      switch (e.key) {
        case 'Enter':
        case ' ':
          keyHandled.current = true;
          choose(activeIndex);
          break;
        case 'Escape':
          close();
          break;
        case 'Tab':
          close();
          handled = false;
          break;
        case 'ArrowDown':
          setActiveIndex(Math.min(last, activeIndex + 1));
          break;
        case 'ArrowUp':
          setActiveIndex(Math.max(0, activeIndex - 1));
          break;
        case 'Home':
        case 'PageUp':
          setActiveIndex(0);
          break;
        case 'End':
        case 'PageDown':
          setActiveIndex(last);
          break;
        default: {
          const i = e.key.length === 1 ? typeAhead(e.key.toLowerCase()) : -1;
          if (i >= 0) setActiveIndex(i);
          else handled = false;
        }
      }
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="picker" ref={rootRef} data-open={open || undefined}>
      {/* invisible copies of every label keep the trigger as wide as the longest one */}
      <span className="picker-sizer" aria-hidden="true">
        {options.map((o) => (
          <span key={o.value}>{o.label}</span>
        ))}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="picker-button"
        title={title}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        onPointerDown={() => (keyHandled.current = false)}
        onClick={() => {
          if (keyHandled.current) {
            keyHandled.current = false;
            return;
          }
          if (open) close();
          else show();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => e.key === ' ' && e.preventDefault()}
      >
        <span className="picker-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="picker-value">{current?.label}</span>
        <svg className="picker-chevron" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={listId} className={`picker-list ${placement}`} role="listbox" aria-label={label} tabIndex={-1} hidden={!open}>
        {options.map((o, i) => (
          <div
            key={o.value}
            id={optionId(i)}
            role="option"
            aria-selected={i === selectedIndex}
            className={`picker-option${i === activeIndex ? ' active' : ''}`}
            // keep focus on the trigger
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => i !== activeIndex && setActiveIndex(i)}
            onClick={() => choose(i)}
          >
            <span>{o.label}</span>
            <svg className="picker-check" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
