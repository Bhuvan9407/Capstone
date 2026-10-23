export const Button = ({ children, variant = 'primary', size = 'md', loading = false, className = '', disabled, ...rest }) => {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-card',
    secondary: 'bg-white text-navy border border-slate-200 hover:bg-slate-50',
    ghost: 'text-navy hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    dark: 'bg-navy text-white hover:bg-navy-50',
    accent: 'bg-accent-purple text-white hover:brightness-110',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {children}
    </button>
  );
};

export default Button;
