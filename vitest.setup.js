import { beforeEach } from 'vitest'

// Setup localStorage mock
beforeEach(() => {
	const localStorageMock = {
		getItem: (key) => {
			return localStorageMock[key] || null
		},
		setItem: (key, value) => {
			localStorageMock[key] = value
		},
		removeItem: (key) => {
			delete localStorageMock[key]
		},
		clear: () => {
			Object.keys(localStorageMock).forEach(key => {
				if (typeof localStorageMock[key] !== 'function') {
					delete localStorageMock[key]
				}
			})
		}
	}

	global.localStorage = localStorageMock
})
