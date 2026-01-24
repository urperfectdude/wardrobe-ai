import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import { Sparkles, Home, Shirt, Wand2, ShoppingBag, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
    const { user, userProfile } = useAuth()

    const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url
    const displayName = userProfile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const initial = displayName?.[0]?.toUpperCase() || 'U'

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                <Link to="/" className="navbar-brand">
                    <Sparkles />
                    <span>Wardrobe AI</span>
                </Link>

                <div className="navbar-nav">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        end
                    >
                        <Home size={20} />
                        <span>Home</span>
                    </NavLink>
                    <NavLink
                        to="/closet"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Shirt size={20} />
                        <span>Closet</span>
                    </NavLink>
                    <NavLink
                        to="/outfit"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Wand2 size={20} />
                        <span>Outfit</span>
                    </NavLink>
                    <NavLink
                        to="/shop"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <ShoppingBag size={20} />
                        <span>Shop</span>
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        {user && avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                            />
                        ) : user ? (
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'hsl(var(--accent))',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.625rem',
                                fontWeight: 600
                            }}>
                                {initial}
                            </div>
                        ) : (
                            <User size={20} />
                        )}
                        <span>Profile</span>
                    </NavLink>
                </div>
            </div>
        </nav>
    )
}
