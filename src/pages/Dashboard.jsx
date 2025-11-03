import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { emailAPI } from '../utils/api'
import socket from '../utils/socket'
import toast from 'react-hot-toast'
import './Dashboard.css'

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    recent24h: 0,
    byRepository: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    
    socket.on('email-added', () => {
      fetchStats()
    })
    
    socket.on('emails-bulk-deleted', () => {
      fetchStats()
    })

    return () => {
      socket.off('email-added')
      socket.off('emails-bulk-deleted')
    }
  }, [])

  const fetchStats = async () => {
    try {
      const response = await emailAPI.getStats()
      setStats(response.data)
    } catch (error) {
      toast.error('Failed to fetch statistics')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="text-muted">Overview of your email collection</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon-wrapper">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="stat-pulse"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.total.toLocaleString()}</h3>
            <p className="stat-label">Total Emails</p>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon-wrapper">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-pulse"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.recent24h.toLocaleString()}</h3>
            <p className="stat-label">Last 24 Hours</p>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon-wrapper">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="stat-pulse"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.byRepository.length}</h3>
            <p className="stat-label">Repositories</p>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/collect" className="action-card">
          <div className="action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <h3>Collect Emails</h3>
          <p>Collect contributor emails from GitHub repositories</p>
        </Link>

        <Link to="/emails" className="action-card">
          <div className="action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h3>View Emails</h3>
          <p>Browse and manage collected emails</p>
        </Link>

        <Link to="/send" className="action-card">
          <div className="action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
          <h3>Send Emails</h3>
          <p>Send bulk emails to contributors</p>
        </Link>
      </div>

      {stats.byRepository.length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <h2 className="card-title">Emails by Repository</h2>
          </div>
          <div className="repositories-list">
            {stats.byRepository.slice(0, 10).map((repo, index) => (
              <div key={index} className="repository-item">
                <span className="repository-name">{repo._id}</span>
                <span className="badge badge-info">{repo.count} emails</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
