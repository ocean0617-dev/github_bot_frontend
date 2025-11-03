import React, { useState, useEffect, useCallback } from 'react'
import { emailAPI } from '../utils/api'
import socket from '../utils/socket'
import toast from 'react-hot-toast'

const ViewEmails = () => {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [repositoryFilter, setRepositoryFilter] = useState('')
  const [collectedFrom, setCollectedFrom] = useState('')
  const [collectedTo, setCollectedTo] = useState('')
  const [sentStatus, setSentStatus] = useState('')
  const [selectedEmails, setSelectedEmails] = useState(new Set())
  const [repositories, setRepositories] = useState([])

  const fetchRepositories = useCallback(async () => {
    try {
      const response = await emailAPI.getStats()
      setRepositories(response.data.byRepository.map(r => r._id))
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
    }
  }, [])

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: pageSize,
        ...(search && { search }),
        ...(repositoryFilter && { repository: repositoryFilter }),
        ...(collectedFrom && { collectedFrom }),
        ...(collectedTo && { collectedTo }),
        ...(sentStatus && { sentStatus })
      }
      const response = await emailAPI.getAll(params)
      setEmails(response.data.emails)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Failed to fetch emails')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, repositoryFilter, collectedFrom, collectedTo, sentStatus])

  useEffect(() => {
    fetchRepositories()
  }, [fetchRepositories])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  useEffect(() => {
    fetchEmails()
    
    socket.on('email-added', () => {
      fetchEmails()
      fetchRepositories()
    })

    socket.on('email-deleted', () => {
      fetchEmails()
      setSelectedEmails(new Set())
    })

    socket.on('emails-bulk-deleted', () => {
      fetchEmails()
      fetchRepositories()
      setSelectedEmails(new Set())
    })

    return () => {
      socket.off('email-added')
      socket.off('email-deleted')
      socket.off('emails-bulk-deleted')
    }
  }, [fetchEmails, fetchRepositories])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this email?')) {
      return
    }

    try {
      await emailAPI.delete(id)
      toast.success('Email deleted')
      fetchEmails()
    } catch (error) {
      toast.error('Failed to delete email')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      toast.error('Please select emails to delete')
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedEmails.size} emails?`)) {
      return
    }

    try {
      await emailAPI.bulkDelete({ ids: Array.from(selectedEmails) })
      toast.success(`${selectedEmails.size} emails deleted`)
      setSelectedEmails(new Set())
      fetchEmails()
    } catch (error) {
      toast.error('Failed to delete emails')
    }
  }

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedEmails(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(emails.map(e => e._id)))
    }
  }

  const clearFilters = () => {
    setSearch('')
    setRepositoryFilter('')
    setCollectedFrom('')
    setCollectedTo('')
    setSentStatus('')
    setPage(1)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>View Emails</h1>
      </div>

      <div className="card mb-3">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search emails, names, or usernames..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Repository</label>
              <select
                className="form-select"
                value={repositoryFilter}
                onChange={(e) => {
                  setRepositoryFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All repositories</option>
                {repositories.map(repo => (
                  <option key={repo} value={repo}>{repo}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Email Status</label>
              <select
                className="form-select"
                value={sentStatus}
                onChange={(e) => {
                  setSentStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All emails</option>
                <option value="sent">Sent</option>
                <option value="unsent">Unsent</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Collected From</label>
              <input
                type="date"
                className="form-input"
                value={collectedFrom}
                onChange={(e) => {
                  setCollectedFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Collected To</label>
              <input
                type="date"
                className="form-input"
                value={collectedTo}
                onChange={(e) => {
                  setCollectedTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(search || repositoryFilter || collectedFrom || collectedTo || sentStatus) && (
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
              {selectedEmails.size > 0 && (
                <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                  Delete Selected ({selectedEmails.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {pagination && (
        <div className="card mb-3">
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div className="text-muted text-sm">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} emails
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '0.875rem' }}>Page Size:</label>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '80px' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
              {pagination.pages > 1 && (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.875rem' }}>Page:</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '80px', textAlign: 'center' }}
                      min="1"
                      max={pagination.pages}
                      value={page}
                      onChange={(e) => {
                        const newPage = Math.max(1, Math.min(pagination.pages, Number(e.target.value) || 1))
                        setPage(newPage)
                      }}
                    />
                    <span className="text-muted text-sm">of {pagination.pages}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={page === pagination.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner-wrapper">
            <div className="spinner large"></div>
            <p className="loading-text">Loading emails...</p>
          </div>
        </div>
      ) : emails.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-content">
            <div className="empty-icon">📭</div>
            <h3>No emails found</h3>
            <p className="text-muted">Try adjusting your filters or collect emails from a repository</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedEmails.size === emails.length && emails.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Repository</th>
                    <th>Collected</th>
                    <th>Email Sent By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email, index) => (
                    <tr key={email._id} style={{ animationDelay: `${index * 0.02}s` }} className="table-row-animate">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(email._id)}
                          onChange={() => toggleSelect(email._id)}
                          className="checkbox-input"
                        />
                      </td>
                      <td>
                        <div className="email-cell">
                          <span className="email-icon">✉️</span>
                          <span>{email.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={email.name ? '' : 'text-muted'}>
                          {email.name || '-'}
                        </span>
                      </td>
                      <td>
                        {email.username ? (
                          <a
                            href={`https://github.com/${email.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="github-link"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            {email.username}
                          </a>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <code className="repo-badge">{email.repository}</code>
                      </td>
                      <td className="text-muted text-sm">
                        <span className="date-badge">
                          {new Date(email.collectedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        {email.emailSent && email.emailSent.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {email.emailSent.map((sent, idx) => (
                              <span
                                key={idx}
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  backgroundColor: sent.sender === 'gmail' ? '#e3f2fd' : '#fff3e0',
                                  color: sent.sender === 'gmail' ? '#1976d2' : '#e65100',
                                  fontWeight: 500
                                }}
                                title={`Sent by ${sent.senderEmail || sent.sender} on ${new Date(sent.sentAt).toLocaleString()}`}
                              >
                                {sent.senderEmail || sent.sender.toUpperCase()}
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
                          onClick={() => handleDelete(email._id)}
                          title="Delete email"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ViewEmails
