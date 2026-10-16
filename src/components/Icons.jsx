// Tiny inline SVG icons (no icon library needed).
function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const HomeIcon = (props) => (<Icon {...props}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Icon>);
export const PlusIcon = (props) => (<Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>);
export const SearchIcon = (props) => (<Icon {...props}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>);
export const MenuIcon = (props) => (<Icon {...props}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>);
export const CloseIcon = (props) => (<Icon {...props}><path d="M6 6l12 12M18 6L6 18" /></Icon>);
export const ReturnIcon = (props) => (<Icon {...props}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></Icon>);
