import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Consistent menu item styling with nav-like hover states
 */
export const menuItemClass = cn(
	"flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md",
	"transition-all duration-200 border-2 border-transparent",
	"text-muted-foreground hover:text-foreground hover:border-primary/50",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	"disabled:opacity-50 disabled:pointer-events-none"
);
