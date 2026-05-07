import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  label?: string;
}

export function Input({ icon, label, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-stack-sm w-full">
      {label && <label className="font-label-sm text-label-sm text-on-surface-variant">{label}</label>}
      <div className="relative flex items-center">
        {icon && (
          <span className="material-symbols-outlined absolute left-4 text-on-surface-variant">
            {icon}
          </span>
        )}
        <input 
          className={`w-full bg-surface-container-highest/50 border border-outline-variant/50 rounded-xl py-3 pr-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-sple-red focus:ring-1 focus:ring-sple-red transition-all ${icon ? 'pl-12' : 'pl-4'} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
