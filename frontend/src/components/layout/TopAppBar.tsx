interface TopAppBarProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

export function TopAppBar({ onMenuClick, onProfileClick }: TopAppBarProps) {
  return (
    <header className="fixed top-4 left-4 right-4 rounded-xl bg-glass-bg backdrop-blur-xl shadow-md z-50 flex justify-between items-center px-safe-margin py-2">
      <button 
        onClick={onMenuClick}
        className="text-on-surface hover:bg-surface-variant/20 transition-all active:scale-95 duration-200 ease-out p-2 rounded-full flex items-center justify-center"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
      <h1 className="font-display-lg text-display-lg font-bold text-sple-red tracking-tight">Sple</h1>
      <button 
        onClick={onProfileClick}
        className="hover:bg-surface-variant/20 transition-all active:scale-95 duration-200 ease-out rounded-full overflow-hidden w-10 h-10 border border-outline/30"
      >
        <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">person</span>
        </div>
      </button>
    </header>
  );
}
