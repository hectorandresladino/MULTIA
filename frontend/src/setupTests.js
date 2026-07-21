import '@testing-library/jest-dom'

// Mock localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null
  },
  setItem(key, value) {
    this.store[key] = String(value)
  },
  removeItem(key) {
    delete this.store[key]
  },
  clear() {
    this.store = {}
  },
}

// Mock import.meta.env
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        VITE_OPENAI_API_KEY: '',
        VITE_ANTHROPIC_API_KEY: '',
        VITE_GEMINI_API_KEY: '',
        VITE_GROQ_API_KEY: '',
        VITE_OLLAMA_BASE_URL: 'http://localhost:11434',
        VITE_API_BASE_URL: '',
      },
    },
  },
})
