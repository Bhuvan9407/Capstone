/** Tiny inline spinner reused where the Button loader is not a fit. */
export const SpinIcon = ({ className = 'h-4 w-4' }) => (
  <span className={`${className} inline-block animate-spin rounded-full border-2 border-blue-200 border-t-blue-600`} aria-hidden="true" />
);
