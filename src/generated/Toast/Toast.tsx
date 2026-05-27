export type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastVariantConfig {
  bg: string;
  border: string;
  text: string;
  iconColor: string;
  icon: string;
  defaultTitle: string;
}

export const TOAST_VARIANT_CONFIG: Record<ToastVariant, ToastVariantConfig> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    iconColor: 'text-green-500',
    icon: '✓',
    defaultTitle: 'Success',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    iconColor: 'text-red-500',
    icon: '✕',
    defaultTitle: 'Error',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    iconColor: 'text-amber-500',
    icon: '⚠',
    defaultTitle: 'Warning',
  },
};

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  title?: string;
  onClose?: () => void;
  visible?: boolean;
}

export function Toast({ variant, message, title, onClose, visible = true }: ToastProps) {
  if (!visible) return null;

  const config = TOAST_VARIANT_CONFIG[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        'flex items-start gap-3 rounded-lg border p-4 shadow-sm' +
        ' ' + config.bg +
        ' ' + config.border +
        ' ' + config.text
      }
    >
      <span
        className={'shrink-0 text-base font-bold leading-5 ' + config.iconColor}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-5">
          {title ?? config.defaultTitle}
        </p>
        <p className="mt-0.5 text-sm opacity-80">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className={
            'shrink-0 rounded p-0.5 leading-none opacity-50' +
            ' transition-opacity hover:opacity-100' +
            ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current'
          }
        >
          ×
        </button>
      )}
    </div>
  );
}
