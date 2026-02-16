import { createRoot } from 'react-dom/client'
import './index.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Wisata Dental</h1>
        <p className="text-gray-600">Application is loading...</p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)