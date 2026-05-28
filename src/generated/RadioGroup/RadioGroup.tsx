import { useId } from 'react';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name?: string;
  label?: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
}

const sizeStyles = {
  sm: { radio: 'h-3.5 w-3.5', dot: 'h-1.5 w-1.5', label: 'text-sm', gap: 'gap-2' },
  md: { radio: 'h-4 w-4', dot: 'h-2 w-2', label: 'text-base', gap: 'gap-2.5' },
  lg: { radio: 'h-5 w-5', dot: 'h-2.5 w-2.5', label: 'text-lg', gap: 'gap-3' },
};

export function RadioGroup({
  name,
  label,
  options,
  value,
  defaultValue,
  onChange,
  orientation = 'vertical',
  size = 'md',
  disabled = false,
  error,
  helperText,
  required = false,
}: RadioGroupProps) {
  const reactId = useId();
  const groupName = name ?? reactId;
  const styles = sizeStyles[size];
  const isControlled = value !== undefined;

  const describedBy = error
    ? `${groupName}-error`
    : helperText
      ? `${groupName}-helper`
      : undefined;

  return (
    <div role="radiogroup" aria-labelledby={label ? `${groupName}-label` : undefined} aria-describedby={describedBy} aria-required={required}>
      {label && (
        <div id={`${groupName}-label`} className="mb-2 text-sm font-medium text-gray-900">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </div>
      )}
      <div className={`flex ${orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-2'}`}>
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`;
          const isDisabled = disabled || option.disabled;
          const isChecked = isControlled ? value === option.value : undefined;
          const defaultChecked = !isControlled ? defaultValue === option.value : undefined;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={`flex items-start ${styles.gap} ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span className="flex items-center pt-0.5">
                <span className="relative flex items-center justify-center">
                  <input
                    id={optionId}
                    type="radio"
                    name={groupName}
                    value={option.value}
                    checked={isChecked}
                    defaultChecked={defaultChecked}
                    disabled={isDisabled}
                    onChange={(e) => onChange?.(e.target.value)}
                    className={`peer ${styles.radio} cursor-[inherit] appearance-none rounded-full border-2 border-gray-300 bg-white transition-colors checked:border-blue-600 hover:border-gray-400 checked:hover:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:hover:border-gray-300 ${error ? 'border-red-500 checked:border-red-600' : ''}`}
                    aria-invalid={!!error}
                  />
                  <span
                    className={`pointer-events-none absolute ${styles.dot} rounded-full bg-blue-600 opacity-0 transition-opacity peer-checked:opacity-100 ${error ? 'bg-red-600' : ''}`}
                  />
                </span>
              </span>
              <span className="flex flex-col">
                <span className={`${styles.label} font-medium text-gray-900`}>{option.label}</span>
                {option.description && (
                  <span className="text-sm text-gray-500">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${groupName}-error`} className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${groupName}-helper`} className="mt-2 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
