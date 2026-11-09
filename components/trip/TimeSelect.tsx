'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface TimeSelectProps {
  label: string;
  hour: string;
  minute: string;
  ampm: string;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
  onAmpmChange: (ampm: string) => void;
}

export default function TimeSelect({ label, hour, minute, ampm, onHourChange, onMinuteChange, onAmpmChange }: TimeSelectProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);
  const timePickerId = useId();

  useEffect(() => {
    function handleOutsidePointer(event: PointerEvent) {
      if (pickerRef.current && event.target && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, []);

  return (
    <div ref={pickerRef} className='flex flex-col gap-1.5 relative'
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          timeButtonRef.current?.focus();
        }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <label htmlFor={`${timePickerId}-button`} className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>{label}</label>
      <button type="button" ref={timeButtonRef} id={`${timePickerId}-button`}
        aria-expanded={open} aria-controls={open ? timePickerId : undefined}
        onClick={() => setOpen(value => !value)}
        className='flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50
            px-3 py-2 text-sm text-gray-700 transition-colors hover:border-purple-400 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400'>
        <span>{`${hour.padStart(2, '0')}:${minute.padStart(2, '0')} ${ampm}`}</span>
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="lucide lucide-clock2-icon lucide-clock-2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4-2"/></svg>
      </button>
      {open && (
        <div id={timePickerId} role="group" aria-label={`Choose ${label.toLowerCase()}`} className='absolute z-10 top-full left-0 right-0 mt-1 grid grid-cols-3 rounded-lg border border-gray-200 bg-gray-50
          px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'>

          <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' >
            {Array.from({ length: 12}, (_, i) => {
              const hourTime = i === 0 ? 12 : i;
              return (
                <button type="button" aria-label={`Hour ${hourTime}`} aria-pressed={String(hourTime) === hour}
                  key={hourTime}
                  className={`w-full cursor-pointer flex items-center justify-center ${String(hourTime) === hour ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                  onClick={() => onHourChange(String(hourTime))}>
                  {String(hourTime).padStart(2, '0')}
                </button>
              )
            })}
          </div>
          <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {Array.from({ length: 60}, (_, i) => {
              const min = i

              return (
                <button type="button" aria-label={`Minute ${String(min).padStart(2, '0')}`} aria-pressed={String(min).padStart(2, '0') === minute}
                  key={min}
                  className={`w-full cursor-pointer flex items-center justify-center ${String(min).padStart(2, '0') === minute ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                  onClick={() => onMinuteChange(String(min))}
                >
                  {String(min).padStart(2, '0')}
                </button>
              )
            })}
          </div>
          <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {['AM', 'PM'].map((m) => (
              <button type="button" aria-pressed={m === ampm}
                key={m}
                className={`w-full cursor-pointer flex items-center justify-center ${m === ampm ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                onClick={() => onAmpmChange(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
