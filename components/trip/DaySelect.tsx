'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });

function formatDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return `${dateFormat.format(date)}, ${weekdayFormat.format(date)}`;
}

export default function DaySelect({ days, value, onChange, disabled = false }: {
  days: string[];
  value: string;
  onChange: (day: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 272 });
  const expanded = open && !disabled && days.length > 0;

  function updatePosition() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(days.length, 6) * 44 + 8;
    const upwards = below < height && above > below;
    const maxHeight = Math.max(0, Math.min(height, upwards ? above : below));
    setPosition({ left: rect.left, top: upwards ? rect.top - maxHeight - 4 : rect.bottom + 4, width: rect.width, maxHeight });
  }

  function show() {
    updatePosition();
    setActive(Math.max(0, days.indexOf(value)));
    setOpen(true);
  }

  function choose(day: string) {
    onChange(day);
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    }
    // Close on layout changes so the floating list cannot drift away from its field.
    function closeOnScroll(event: Event) {
      if (!list.current?.contains(event.target as Node)) setOpen(false);
    }
    function close() { setOpen(false); }
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded || !list.current) return;
    const option = list.current.children[active] as HTMLElement | undefined;
    if (!option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.current.scrollTop) list.current.scrollTop = top;
    else if (bottom > list.current.scrollTop + list.current.clientHeight) list.current.scrollTop = bottom - list.current.clientHeight;
  }, [expanded, active]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-gray-500">Day</label>
      <button ref={trigger} id={id} type="button" role="combobox" aria-haspopup="listbox"
        aria-expanded={expanded} aria-controls={expanded ? `${id}-list` : undefined}
        aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
        disabled={disabled || !days.length}
        onClick={() => expanded ? setOpen(false) : show()}
        onBlur={() => setOpen(false)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!expanded) show();
            else setActive(index => Math.max(0, Math.min(days.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          } else if (expanded && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault();
            setActive(event.key === 'Home' ? 0 : days.length - 1);
          } else if (expanded && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            choose(days[active]);
          } else if (expanded && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-purple-400 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-50">
        <span>{value ? formatDay(value) : 'Select a day'}</span>
        <ChevronDown aria-hidden="true" size={18} className={expanded ? 'rotate-180' : ''} />
      </button>
      {expanded && createPortal(
        <ul ref={list} id={`${id}-list`} role="listbox" aria-label="Choose a day"
          style={position} onMouseDown={event => event.preventDefault()}
          className="fixed z-[100] m-0 overflow-y-auto overscroll-contain rounded-lg bg-white p-1 text-sm text-gray-700 shadow-lg ring-1 ring-gray-200">
          {days.map((day, index) => (
            <li key={day} id={`${id}-option-${index}`} role="option" aria-selected={day === value}
              onClick={() => choose(day)} title={day}
              className={`flex h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 hover:bg-purple-50 ${index === active ? 'bg-purple-100 text-purple-800' : ''}`}>
              <span>{formatDay(day)}</span>
              {day === value && <Check aria-hidden="true" size={16} />}
            </li>
          ))}
        </ul>, document.body
      )}
    </div>
  );
}
