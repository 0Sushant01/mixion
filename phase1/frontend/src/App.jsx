import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import BottlePage from './pages/BottlePage'

function App() {
    return (
        <div className="App">
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/bottles" element={<BottlePage />} />
            </Routes>
        </div>
    )
}

export default App
