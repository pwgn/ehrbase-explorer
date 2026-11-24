import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequestError } from './api/ehrbase'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'

// Retrying only helps with network and server errors; a 4xx or an empty
// answer (deleted composition) comes back the same.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (failures, error) => !(error instanceof RequestError && error.status < 500) && failures < 3 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
