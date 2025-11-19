import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Consistent menu item styling with proper focus states
 */
export const menuItemClass = cn(
	"flex w-full items-center gap-2 px-3 py-2 text-sm",
	"transition-colors duration-200",
	"hover:bg-accent hover:text-accent-foreground",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	"disabled:opacity-50 disabled:pointer-events-none"
);
