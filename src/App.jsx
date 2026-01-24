import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MyCloset from './pages/MyCloset'
import GetOutfit from './pages/GetOutfit'
import Shop from './pages/Shop'
import Profile from './pages/Profile'

function App() {
    return (
        <AuthProvider>
            <Navbar />
            <main className="page">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/closet" element={<MyCloset />} />
                    <Route path="/outfit" element={<GetOutfit />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </main>
        </AuthProvider>
    )
}

export default App

