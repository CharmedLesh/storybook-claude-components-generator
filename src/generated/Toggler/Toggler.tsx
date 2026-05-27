export interface TogglerProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  labelPosition?: 'top' | 'left' | 'right';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4', label: 'text-sm' },
  md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5', label: 'text-base' },
  lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7', label: 'text-lg' },
};

export function Toggler({
  checked = false,
  onChange,
  label,
  labelPosition = 'right',
  disabled = false,
  size = 'md',
}: TogglerProps) {
  const s = sizeMap[size];

  const track = [
    s.track,
    'rounded-full relative inline-flex items-center shrink-0 cursor-pointer transition-colors duration-200',
    checked ? 'bg-blue-600' : 'bg-gray-300',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');

  const thumb = [
    s.thumb,
    'block rounded-full bg-white shadow-sm transition-transform duration-200 absolute left-0.5',
    checked ? s.translate : 'translate-x-0',
  ].join(' ');

  const toggle = () => {
    if (!disabled) onChange?.(!checked);
  };

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label && labelPosition !== 'top' ? undefined : (label || 'Toggle')}
      disabled={disabled}
      onClick={toggle}
      className={track}
    >
      <span className={thumb} />
    </button>
  );

  if (!label) return button;

  const labelEl = (
    <span className={`${s.label} ${disabled ? 'opacity-50' : ''} select-none`}>
      {label}
    </span>
  );

  if (labelPosition === 'top') {
    return (
      <div className="inline-flex flex-col gap-1.5">
        {labelEl}
        {button}
      </div>
    );
  }

  const isLeft = labelPosition === 'left';

  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer">
      {isLeft && labelEl}
      {button}
      {!isLeft && labelEl}
    </label>
  );
}
