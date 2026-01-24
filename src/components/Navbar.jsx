import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import { Sparkles, Shirt, Wand2, ShoppingBag, User, LogOut, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from './OnboardingFlow'

export default function Navbar() {
    const { user, userProfile, loading, signOut } = useAuth()
    const [showMenu, setShowMenu] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)

    const handleSignOut = async () => {
        try {
            await signOut()
            setShowMenu(false)
        } catch (error) {
            console.error('Sign out error:', error)
        }
    }

    const displayName = userProfile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url
    const initial = displayName?.[0]?.toUpperCase() || 'U'

    return (
        <>
            <nav className="navbar">
                <div className="container navbar-container">
                    <Link to="/" className="navbar-brand">
                        <Sparkles />
                        <span>Wardrobe AI</span>
                    </Link>

                    <div className="navbar-nav">
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
                    </div>

                    {/* Auth Section - Desktop only */}
                    <div className="navbar-auth">
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
                        ) : user ? (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid hsl(var(--border))',
                                        background: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Profile"
                                            style={{
                                                width: '1.5rem',
                                                height: '1.5rem',
                                                borderRadius: '50%'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '1.5rem',
                                            height: '1.5rem',
                                            borderRadius: '50%',
                                            background: 'hsl(var(--accent))',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {initial}
                                        </div>
                                    )}
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        maxWidth: '80px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {displayName.split(' ')[0]}
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {showMenu && (
                                        <>
                                            <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                                                onClick={() => setShowMenu(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 'calc(100% + 0.5rem)',
                                                    background: 'white',
                                                    borderRadius: 'var(--radius-lg)',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    border: '1px solid hsl(var(--border))',
                                                    padding: '0.5rem',
                                                    minWidth: '160px',
                                                    zIndex: 100
                                                }}
                                            >
                                                <div style={{
                                                    padding: '0.5rem',
                                                    borderBottom: '1px solid hsl(var(--border))',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <p style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        margin: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {displayName}
                                                    </p>
                                                    <p style={{
                                                        fontSize: '0.625rem',
                                                        color: 'hsl(var(--muted-foreground))',
                                                        margin: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {user.phone || user.email}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleSignOut}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        border: 'none',
                                                        background: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        color: 'hsl(var(--destructive))'
                                                    }}
                                                >
                                                    <LogOut size={14} />
                                                    Sign Out
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowOnboarding(true)}
                                className="btn btn-sm"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '0.75rem',
                                    padding: '0.375rem 0.75rem'
                                }}
                            >
                                <User size={14} />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Onboarding Flow */}
            <AnimatePresence>
                {showOnboarding && (
                    <OnboardingFlow
                        isOpen={showOnboarding}
                        onClose={() => setShowOnboarding(false)}
                        onComplete={() => setShowOnboarding(false)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
