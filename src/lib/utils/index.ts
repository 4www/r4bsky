import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
	return clsx(inputs);
}

export const menuItemClass = "menu-item";

export const menuTriggerClass = (active = false) => clsx("menu-trigger", active && "active");
