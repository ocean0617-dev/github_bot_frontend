import React, { useState, useEffect } from 'react'
import { githubAPI } from '../utils/api'
import socket from '../utils/socket'
import toast from 'react-hot-toast'

const CollectEmails = () => {
  const [repository, setRepository] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [options, setOptions] = useState({
    includeContributors: true,
    includeCommits: true,
    maxCommits: 1000
  })

  useEffect(() => {
    socket.on('collection-progress', (data) => {
      setProgress(data)
    })

    socket.on('collection-complete', (result) => {
      setLoading(false)
      setProgress(null)
      toast.success(`Collection complete! Saved ${result.saved} emails`)
    })

    socket.on('collection-error', (error) => {
      setLoading(false)
      setProgress(null)
      toast.error(`Collection error: ${error.error}`)
    })

    return () => {
      socket.off('collection-progress')
      socket.off('collection-complete')
      socket.off('collection-error')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!repository.trim()) {
      toast.error('Please enter a repository')
      return
    }

    setLoading(true)
    setProgress(null)

    try {
      await githubAPI.collect(repository.trim(), options, githubToken.trim() || undefined)
      toast.success('Email collection started!')
    } catch (error) {
      setLoading(false)
      toast.error(error.response?.data?.error || 'Failed to start collection')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Collect Emails</h1>
        <p className="text-muted">Collect contributor emails from any GitHub repository</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Repository</label>
            <input
              type="text"
              className="form-input"
              placeholder="owner/repo or https://github.com/owner/repo"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              disabled={loading}
            />
            <div className="form-help">
              Examples: facebook/react, https://github.com/nodejs/node, microsoft/vscode
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">GitHub Token (Optional)</label>
            <input
              type="password"
              className="form-input"
              placeholder="ghp_xxxx... (Leave empty for 60 requests/hour, add token for 5,000 requests/hour)"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              disabled={loading}
            />
            <div className="form-help">
              Optional: Add a GitHub Personal Access Token to increase rate limit from 60 to 5,000 requests/hour
              <br />
              <a 
                href="https://github.com/settings/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'underline' }}
              >
                Create token here
              </a>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Collection Options</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={options.includeContributors}
                  onChange={(e) => setOptions({ ...options, includeContributors: e.target.checked })}
                  disabled={loading}
                />
                <span>Collect from contributors</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={options.includeCommits}
                  onChange={(e) => setOptions({ ...options, includeCommits: e.target.checked })}
                  disabled={loading}
                />
                <span>Collect from commit authors</span>
              </label>

              {options.includeCommits && (
                <div style={{ marginLeft: '1.5rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>Max commits to process</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="100000"
                    value={options.maxCommits}
                    onChange={(e) => setOptions({ ...options, maxCommits: parseInt(e.target.value) || 1000 })}
                    disabled={loading}
                    style={{ width: '150px' }}
                  />
                  <div className="form-help" style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#666' }}>
                    More commits = more emails found (max: 100,000)
                  </div>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Collecting...
              </>
            ) : (
              'Start Collection'
            )}
          </button>
        </form>
      </div>

      {progress && (
        <div className="card mt-3 progress-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="progress-icon">⚡</span>
              Collection Progress
            </h3>
          </div>
          <div className="progress-info">
            <div className="progress-stage">
              <span className="stage-badge">{progress.stage}</span>
            </div>
            <div className="progress-message">
              {progress.message}
            </div>
            {(progress.collected !== undefined || progress.totalFetched !== undefined) && (
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill"
                    style={{ 
                      width: progress.totalFetched ? `${Math.min((progress.totalFetched / 3100) * 100, 100)}%` : '0%'
                    }}
                  />
                </div>
                <div className="progress-stats">
                  {progress.totalFetched !== undefined && (
                    <span className="stat-item">
                      <strong>{progress.totalFetched}</strong> contributors fetched
                    </span>
                  )}
                  {progress.collected !== undefined && (
                    <span className="stat-item">
                      <strong>{progress.collected}</strong> emails found
                    </span>
                  )}
                  {progress.saved !== undefined && (
                    <span className="stat-item success">
                      <strong>{progress.saved}</strong> saved
                    </span>
                  )}
                  {progress.duplicates !== undefined && (
                    <span className="stat-item muted">
                      <strong>{progress.duplicates}</strong> duplicates
                    </span>
                  )}
                  {progress.page && (
                    <span className="stat-item muted">
                      Page <strong>{progress.page}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CollectEmails
