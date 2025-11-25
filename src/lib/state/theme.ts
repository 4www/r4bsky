import { writable, type Writable } from 'svelte/store'
import { browser } from '$app/environment'

export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemeData {
	mode: ThemeMode
}

export interface ThemeStore extends Writable<ThemeData> {
	setMode: (mode: ThemeMode) => void
	getEffectiveMode: () => 'light' | 'dark'
}

function getSystemPreference(): 'light' | 'dark' {
	if (!browser) return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function createThemeStore(): ThemeStore {
	const initialData: ThemeData = {
		mode: 'auto',
	}

	const { subscribe, set, update } = writable<ThemeData>(initialData)

	// Listen for system preference changes
	if (browser) {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		mediaQuery.addEventListener('change', () => {
			// Trigger reactivity by updating the store
			update((data) => ({ ...data }))
		})
	}

	function setMode(mode: ThemeMode): void {
		update((data) => ({ ...data, mode }))
	}

	function getEffectiveMode(): 'light' | 'dark' {
		let currentMode: ThemeMode = 'auto'
		subscribe((data) => {
			currentMode = data.mode
		})()

		if (currentMode === 'auto') {
			return getSystemPreference()
		}
		return currentMode
	}

	return {
		subscribe,
		set,
		update,
		setMode,
		getEffectiveMode,
	}
}

export const theme = createThemeStore()
