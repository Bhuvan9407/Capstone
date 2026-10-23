const PageHeading = ({ title, subtitle, actions, icon: Icon }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy sm:text-2xl">
        {Icon && <Icon className="h-6 w-6 text-blue-600" />}
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeading;
