import React, { useState, useEffect } from 'react'
import { emailAPI, repositoryAPI } from '../utils/api'
import toast from 'react-hot-toast'

const Repositories = () => {
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      const response = await emailAPI.getStats()
      
      // Get repository stats
      const repoStats = response.data.byRepository || []
      
      // Fetch repository send history from backend
      const repoDetails = await Promise.all(
        repoStats.map(async (repo) => {
          try {
            // Fetch repository details from backend
            const apiUrl = import.meta.env.VITE_API_URL || '/api'
            const repoResponse = await fetch(`${apiUrl}/repositories/${encodeURIComponent(repo._id)}`)
            if (repoResponse.ok) {
              const repoData = await repoResponse.json()
              return {
                ...repo,
                  sendHistory: repoData.sendHistory || [],
                totalEmails: repoData.totalEmails || repo.count || 0,
                collectedAt: repoData.collectedAt
              }
            }
          } catch (error) {
            console.error(`Failed to fetch details for ${repo._id}:`, error)
          }
          return {
            ...repo,
            sendHistory: [],
            totalEmails: repo.count || 0,
            collectedAt: null
          }
        })
      )
      
      setRepositories(repoDetails)
    } catch (error) {
      toast.error('Failed to fetch repositories')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRepositories = repositories.filter(repo =>
    repo._id.toLowerCase().includes(search.toLowerCase())
  )

  const getLastSent = (repo) => {
    let lastSent = null
    
    if (repo.sendHistory && repo.sendHistory.length > 0) {
      repo.sendHistory.forEach(history => {
        if (!lastSent || new Date(history.sentAt) > new Date(lastSent)) {
          lastSent = history.sentAt
        }
      })
    }
    
    return lastSent
  }

  const handleDelete = async (repository) => {
    if (!window.confirm(`Are you sure you want to delete "${repository}"? This will also delete all associated emails.`)) {
      return
    }

    try {
      await repositoryAPI.delete(repository)
      toast.success(`Repository "${repository}" deleted successfully`)
      // Refresh the repositories list
      fetchRepositories()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete repository')
      console.error('Error deleting repository:', error)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Repository Monitoring</h1>
        <p className="text-muted">View repository collection and sending statistics</p>
      </div>

      <div className="card mb-3">
        <div className="form-group">
          <label className="form-label">Search Repositories</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by repository name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner-wrapper">
            <div className="spinner large"></div>
            <p className="loading-text">Loading repositories...</p>
          </div>
        </div>
      ) : filteredRepositories.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-content">
            <div className="empty-icon">📦</div>
            <h3>No repositories found</h3>
            <p className="text-muted">Start collecting emails from repositories to see statistics</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Total Emails</th>
                  <th>Collected</th>
                  <th>Last Sent</th>
                  <th>Senders</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepositories.map((repo, index) => {
                  const lastSent = getLastSent(repo)
                  // Extract unique sender emails from sendHistory
                  const senderEmails = repo.sendHistory && repo.sendHistory.length > 0
                    ? [...new Set(repo.sendHistory.map(h => h.senderEmail || h.sender).filter(Boolean))]
                    : []
                  
                  return (
                    <tr key={repo._id} style={{ animationDelay: `${index * 0.02}s` }} className="table-row-animate">
                      <td>
                        <code className="repo-badge" style={{ fontSize: '0.9rem' }}>{repo._id}</code>
                      </td>
                      <td>
                        <strong>{repo.totalEmails || repo.count || 0}</strong>
                      </td>
                      <td className="text-muted text-sm">
                        {repo.collectedAt ? (
                          <span className="date-badge">
                            {new Date(repo.collectedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="text-muted text-sm">
                        {lastSent ? (
                          <span className="date-badge">
                            {new Date(lastSent).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {senderEmails.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {senderEmails.map((senderEmail, idx) => (
                              <span
                                key={idx}
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  backgroundColor: senderEmail.includes('gmail') ? '#e3f2fd' : '#fff3e0',
                                  color: senderEmail.includes('gmail') ? '#1976d2' : '#e65100',
                                  fontWeight: 500
                                }}
                              >
                                {senderEmail}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.875rem' }}>-</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDelete(repo._id)}
                          title="Delete repository"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Repositories

