import { clsx } from "clsx";

export const menuItemClass = "menu-item";

export const menuTriggerClass = (active = false) => clsx("menu-trigger", active && "active");
