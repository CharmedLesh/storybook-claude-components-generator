'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface DropdownOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

const sizeClasses: Record<NonNullable<DropdownProps['size']>, string> = {
  sm: 'text-sm px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
};

export function Dropdown({
  options,
  value,
  defaultValue,
  placeholder = 'Select an option',
  label,
  disabled = false,
  size = 'md',
  fullWidth = false,
  onChange,
}: DropdownProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const labelId = useId();

  const currentValue = isControlled ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const commitValue = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const moveActive = (direction: 1 | -1) => {
    if (options.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < options.length; i++) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].disabled) {
        setActiveIndex(next);
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(options.findIndex((opt) => !opt.disabled));
        } else {
          moveActive(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          moveActive(-1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          const idx = options.findIndex((opt) => opt.value === currentValue && !opt.disabled);
          setActiveIndex(idx >= 0 ? idx : options.findIndex((opt) => !opt.disabled));
        } else if (activeIndex >= 0 && !options[activeIndex].disabled) {
          commitValue(options[activeIndex].value);
          setOpen(false);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const triggerClasses = [
    'inline-flex items-center justify-between gap-2 rounded-md border bg-white text-left text-gray-900 shadow-sm transition-colors',
    'border-gray-300 hover:border-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400',
    sizeClasses[size],
    fullWidth ? 'w-full' : 'min-w-[12rem]',
  ].join(' ');

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label id={labelId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={label ? labelId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={triggerClasses}
      >
        <span className={selectedOption ? '' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-10 mt-1 max-h-60 w-full min-w-[12rem] overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No options</li>
          )}
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            const isActive = index === activeIndex;
            const itemClasses = [
              'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
              option.disabled
                ? 'cursor-not-allowed text-gray-400'
                : isActive
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-900 hover:bg-gray-50',
              isSelected && !option.disabled ? 'font-medium' : '',
            ].join(' ');
            return (
              <li
                key={option.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (option.disabled) return;
                  commitValue(option.value);
                  setOpen(false);
                }}
                className={itemClasses}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12l6.8-6.7a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
