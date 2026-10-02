import { Routes, Route } from 'react-router-dom'

/**
 * App — Root routing component
 *
 * Stage 0: Minimal placeholder.
 * Routes will be expanded in Stage 1 when authentication and pages are built.
 *
 * Planned route structure:
 *   /               → Redirect based on auth state
 *   /login          → Login page
 *   /register       → Registration page
 *   /dashboard      → Shopkeeper dashboard (protected)
 *   /ledger/:id     → Customer ledger view (protected)
 *   /customer/...   → Customer-facing views (protected)
 */
function App() {
  return (
    <Routes>
      <Route
        path="*"
        element={
          <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
            <div className="max-w-sm">
              <div className="mb-4 text-4xl font-bold text-green-600">
                Vyapar Link
              </div>
              <p className="text-gray-500 text-sm">
                Foundation is set up.
                <br />
                Business features coming in Stage 1.
              </p>
              <p className="mt-4 rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-400">
                React + Vite + TypeScript ✓<br />
                Tailwind CSS ✓<br />
                React Router ✓<br />
                TanStack Query ✓
              </p>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

export default App
