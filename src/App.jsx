import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import OnboardingCheck from './components/OnboardingCheck'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MyCloset from './pages/MyCloset'
import GetOutfit from './pages/GetOutfit'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import OutfitPage from './pages/OutfitPage'

function App() {
    return (
        <AuthProvider>
            <OnboardingCheck />
            <Navbar />
            <main className="page">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/closet" element={<MyCloset />} />
                    <Route path="/outfit" element={<GetOutfit />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/user/:username" element={<UserProfile />} />
                    <Route path="/outfit/:id" element={<OutfitPage />} />
                </Routes>
            </main>
        </AuthProvider>
    )
}

export default App

