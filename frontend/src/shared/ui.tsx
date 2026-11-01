import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type ButtonIntent = 'primary' | 'secondary' | 'quiet';

export function Button({ intent = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { intent?: ButtonIntent }) {
  return <button {...props} type={type} className={`button button--${intent} ${className}`.trim()} />;
}

export function StatusNotice({ children, tone = 'info', className = '' }: { children: ReactNode; tone?: 'info' | 'error' | 'success'; className?: string }) {
  return <div className={`notice notice--${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>{children}</div>;
}

export function Dialog({ open, title, closeLabel, onOpenChange, children }: {
  open: boolean;
  title: string;
  closeLabel: string;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onOpenChange(false); }}>
      <div className="dialog__header">
        <h2 id={id}>{title}</h2>
        <Button intent="quiet" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
          <X aria-hidden="true" size={16} strokeWidth={1.1} />
          <span>{closeLabel}</span>
        </Button>
      </div>
      <div className="dialog__body">{children}</div>
    </dialog>
  );
}

export function LocaleControl({ locale, label, onChange }: { locale: 'en' | 'ru'; label: string; onChange(locale: 'en' | 'ru'): void }) {
  return (
    <label className="locale-control">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={locale} onChange={(event) => onChange(event.currentTarget.value === 'ru' ? 'ru' : 'en')}>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
    </label>
  );
}
