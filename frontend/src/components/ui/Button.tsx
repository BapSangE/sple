import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "icon";
  icon?: string;
  fullWidth?: boolean;
}

export function Button({ variant = "primary", icon, fullWidth, className = "", children, ...props }: ButtonProps) {
  const baseClasses = "flex items-center justify-center gap-2 transition-all active:scale-95 duration-200";
  
  const variantClasses = {
    primary: "bg-sple-red text-on-primary-container font-title-sm text-title-sm font-bold rounded-full py-3 px-6 shadow-lg shadow-sple-red/20 hover:opacity-90",
    secondary: "bg-surface-variant text-on-surface font-title-sm text-title-sm rounded-full py-3 px-6 border border-surface-variant hover:bg-surface-container-highest",
    icon: "bg-surface-container-highest text-on-surface rounded-full w-14 h-14 backdrop-blur-xl border border-surface-variant hover:bg-surface-variant/50"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className={`material-symbols-outlined ${variant === 'primary' ? 'fill' : ''}`}>{icon}</span>}
      {children}
    </button>
  );
}
