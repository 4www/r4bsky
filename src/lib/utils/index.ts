import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Consistent menu item styling with nav-like hover states
 */
export const menuItemClass = cn(
	"flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-left justify-start",
	"transition-all duration-200 border border-foreground bg-background",
	"text-foreground hover:bg-foreground hover:text-background",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
	"disabled:opacity-50 disabled:pointer-events-none disabled:border-foreground disabled:bg-background disabled:text-foreground"
);
