import { cloneElement, isValidElement, useId, forwardRef } from 'react';

/** Field associates its label with the first form control it wraps
 *  ( htmlFor + id ) so inputs get accessible names and click-to-focus. */
export const Field = ({ label, hint, error, children, required }) => {
  const autoId = useId();
  const child = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || autoId })
    : children;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={isValidElement(children) ? (children.props.id || autoId) : undefined} className="mb-1.5 block text-sm font-semibold text-navy">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {child}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
};

const base =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50';

export const Input = forwardRef(({ error, className = '', ...rest }, ref) => (
  <input ref={ref} className={`${base} ${error ? 'border-rose-400' : ''} ${className}`} {...rest} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ error, className = '', ...rest }, ref) => (
  <textarea ref={ref} className={`${base} ${error ? 'border-rose-400' : ''} ${className}`} {...rest} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ error, className = '', children, ...rest }, ref) => (
  <select ref={ref} className={`${base} ${error ? 'border-rose-400' : ''} ${className}`} {...rest}>
    {children}
  </select>
));
Select.displayName = 'Select';
