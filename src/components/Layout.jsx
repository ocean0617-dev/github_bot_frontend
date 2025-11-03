import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

const Layout = ({ children }) => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            GitHub Email Collector
          </Link>
          <div className="navbar-links">
            <Link to="/" className={isActive('/') ? 'active' : ''}>
              Dashboard
            </Link>
            <Link to="/collect" className={isActive('/collect') ? 'active' : ''}>
              Collect
            </Link>
            <Link to="/emails" className={isActive('/emails') ? 'active' : ''}>
              Emails
            </Link>
            <Link to="/repositories" className={isActive('/repositories') ? 'active' : ''}>
              Repositories
            </Link>
            <Link to="/send" className={isActive('/send') ? 'active' : ''}>
              Send
            </Link>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout
