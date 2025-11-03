import React, { useState, useEffect } from 'react'
import { sendAPI, emailAPI } from '../utils/api'
import socket from '../utils/socket'
import toast from 'react-hot-toast'

const SendEmails = () => {
  const [formData, setFormData] = useState({
    toType: 'repository',
    repository: '',
    repositoryLimit: 500,
    customEmails: '',
    subject: '',
    htmlTemplate: '',
    textTemplate: '',
    batchSize: 5,
    delay: 1000,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    senderName: ''
  })
  const [loading, setLoading] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [smtpStatus, setSmtpStatus] = useState(null)
  const [progress, setProgress] = useState(null)
  const [repositories, setRepositories] = useState([])

  useEffect(() => {
    fetchRepositories()
    
    socket.on('bulk-send-progress', (progressData) => {
      setProgress({
        message: progressData.message,
        sent: progressData.sent,
        failed: progressData.failed,
        total: progressData.total,
        percentage: progressData.percentage
      })
    })

    socket.on('bulk-send-complete', (result) => {
      setLoading(false)
      setProgress({
        message: `Completed! Sent: ${result.sent}, Failed: ${result.failed}`,
        sent: result.sent,
        failed: result.failed,
        total: result.total,
        percentage: 100
      })
      toast.success(`Sent ${result.sent} emails successfully. ${result.failed} failed.`)
    })

    socket.on('bulk-send-error', (error) => {
      setLoading(false)
      setProgress(null)
      toast.error(`Send error: ${error.error}`)
    })

    return () => {
      socket.off('bulk-send-progress')
      socket.off('bulk-send-complete')
      socket.off('bulk-send-error')
    }
  }, [])

  const testConnection = async () => {
    if (!formData.smtpHost || !formData.smtpPort) {
      toast.error('Please enter SMTP Host and Port')
      return
    }

    setTestingConnection(true)
    setConnectionStatus(null)

    try {
      let cleanHost = formData.smtpHost.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^smtp:\/\//i, '')
        .trim()

      const response = await sendAPI.testConnection(cleanHost, parseInt(formData.smtpPort) || 587)
      setConnectionStatus({ 
        success: response.data.success, 
        message: response.data.message,
        suggestion: response.data.suggestion,
        detectedNetwork: response.data.detectedNetwork
      })
      if (response.data.success) {
        toast.success('Port is reachable! ✅')
      } else {
        toast.error('Port connection failed')
      }
    } catch (error) {
      setConnectionStatus({ 
        success: false, 
        message: error.response?.data?.message || 'Connection test failed',
        suggestion: error.response?.data?.suggestion || '',
        detectedNetwork: error.response?.data?.detectedNetwork
      })
      toast.error('Connection test failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const testSMTP = async () => {
    if (!formData.smtpHost || !formData.smtpUser || !formData.smtpPass) {
      setSmtpStatus({ 
        success: false, 
        message: 'Please fill in SMTP Host, Email, and Password to test' 
      })
      return
    }

    setTestingSMTP(true)
    setSmtpStatus(null)

    try {
      // Clean host: remove protocol prefixes and trim whitespace
      let cleanHost = formData.smtpHost.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^smtp:\/\//i, '')
        .trim()

      const response = await sendAPI.testSMTP({
        host: cleanHost,
        port: parseInt(formData.smtpPort) || 587,
        user: formData.smtpUser.trim(),
        pass: formData.smtpPass,
        senderName: formData.senderName.trim()
      })
      setSmtpStatus({ success: true, message: response.data.message })
      toast.success('SMTP connection successful! ✅')
    } catch (error) {
      setSmtpStatus({ 
        success: false, 
        message: error.response?.data?.error || 'SMTP configuration error' 
      })
      toast.error('SMTP connection failed')
    } finally {
      setTestingSMTP(false)
    }
  }

  const fetchRepositories = async () => {
    try {
      const response = await emailAPI.getStats()
      setRepositories(response.data.byRepository.map(r => r._id))
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.subject || !formData.htmlTemplate) {
      toast.error('Subject and HTML template are required')
      return
    }

    if (!formData.smtpHost || !formData.smtpUser || !formData.smtpPass) {
      toast.error('SMTP configuration is required (Host, Email, and Password)')
      return
    }

    setLoading(true)
    setProgress({ message: 'Preparing to send emails...' })

    try {
      // Clean host: remove protocol prefixes and trim whitespace
      let cleanHost = formData.smtpHost.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^smtp:\/\//i, '')
        .trim()

      let requestData = {
        subject: formData.subject,
        htmlTemplate: formData.htmlTemplate,
        batchSize: parseInt(formData.batchSize) || 5,
        delay: parseInt(formData.delay) || 1000,
        smtpConfig: {
          host: cleanHost,
          port: parseInt(formData.smtpPort) || 587,
          user: formData.smtpUser.trim(),
          pass: formData.smtpPass,
          from: formData.smtpUser.trim(), // Set from to user email by default
          senderName: formData.senderName.trim() || ''
        }
      }

      if (formData.textTemplate) {
        requestData.textTemplate = formData.textTemplate
      }

      switch (formData.toType) {
        case 'repository':
          if (!formData.repository) {
            toast.error('Please select a repository')
            setLoading(false)
            return
          }
          requestData.repository = formData.repository
          // Add limit for repository sending (max 500)
          const limit = Math.min(parseInt(formData.repositoryLimit) || 500, 500)
          if (limit > 0) {
            requestData.smtpConfig.limit = limit
          }
          break
        case 'custom':
          if (!formData.customEmails) {
            toast.error('Please enter email addresses')
            setLoading(false)
            return
          }
          requestData.customEmails = formData.customEmails
            .split('\n')
            .map(e => e.trim())
            .filter(e => e)
          break
      }

      await sendAPI.sendBulk(requestData)
      toast.success('Email sending started!')
    } catch (error) {
      setLoading(false)
      setProgress(null)
      toast.error(error.response?.data?.error || 'Failed to start sending')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Send Emails</h1>
        <p className="text-muted">Send bulk emails to contributors or any email address</p>
      </div>

      <div className="card mb-3">
        <div className="card-header">
          <h2 className="card-title">SMTP Configuration</h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">SMTP Host *</label>
              <input
                type="text"
                className="form-input"
                placeholder="smtp.gmail.com"
                value={formData.smtpHost}
                onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                disabled={loading}
                required
              />
              <div className="form-help">e.g., smtp.gmail.com, smtp.outlook.com</div>
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Port *</label>
              <select
                className="form-select"
                value={formData.smtpPort}
                onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                disabled={loading}
                required
              >
                <option value="587">587 (STARTTLS/TLS)</option>
                <option value="465">465 (SSL)</option>
                <option value="25">25 (Legacy - rarely works)</option>
              </select>
              <div className="form-help">587 (STARTTLS) or 465 (SSL). Try 465 if 587 times out.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Sender Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="your-email@gmail.com"
                value={formData.smtpUser}
                onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sender Password *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Your email password or app password"
                value={formData.smtpPass}
                onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                disabled={loading}
                required
              />
              <div className="form-help">Use App Password for Gmail with 2FA</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sender Name (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={formData.senderName}
              onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              disabled={loading}
            />
            <div className="form-help">Display name for the sender</div>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={testConnection}
                disabled={loading || testingConnection || !formData.smtpHost || !formData.smtpPort}
                style={{
                  background: connectionStatus?.success 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : connectionStatus?.success === false
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'var(--bg-tertiary)',
                  color: connectionStatus ? 'white' : 'var(--text-primary)',
                  border: connectionStatus?.success 
                    ? '1px solid #10b981' 
                    : connectionStatus?.success === false
                    ? '1px solid #ef4444'
                    : '1px solid var(--border)',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: '0.5rem',
                  cursor: (loading || testingConnection || !formData.smtpHost || !formData.smtpPort) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '180px',
                  justifyContent: 'center'
                }}
              >
                {testingConnection ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                    <span>Testing Port...</span>
                  </>
                ) : connectionStatus?.success ? (
                  <>
                    <span>✅</span>
                    <span>Port Reachable</span>
                  </>
                ) : connectionStatus?.success === false ? (
                  <>
                    <span>❌</span>
                    <span>Port Blocked</span>
                  </>
                ) : (
                  <>
                    <span>🔌</span>
                    <span>Test Port Connection</span>
                  </>
                )}
              </button>

              <button 
              type="button"
              className="btn btn-secondary"
              onClick={testSMTP}
              disabled={loading || testingSMTP || !formData.smtpHost || !formData.smtpUser || !formData.smtpPass}
              style={{
                position: 'relative',
                background: smtpStatus?.success 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : smtpStatus?.success === false
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'var(--bg-tertiary)',
                color: smtpStatus ? 'white' : 'var(--text-primary)',
                border: smtpStatus?.success 
                  ? '1px solid #10b981' 
                  : smtpStatus?.success === false
                  ? '1px solid #ef4444'
                  : '1px solid var(--border)',
                padding: '0.875rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                cursor: (loading || testingSMTP || !formData.smtpHost || !formData.smtpUser || !formData.smtpPass) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: smtpStatus?.success 
                  ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                  : smtpStatus?.success === false
                  ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                  : 'none',
                transform: 'translateY(0)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                minWidth: '200px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled && !smtpStatus) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!smtpStatus) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {testingSMTP ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                  <span>Testing Connection...</span>
                </>
              ) : smtpStatus?.success ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Connection Successful</span>
                </>
              ) : smtpStatus?.success === false ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <span>Connection Failed</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                  </svg>
                  <span>Test SMTP Connection</span>
                </>
              )}
            </button>

            {connectionStatus && (
              <div 
                className={`alert ${connectionStatus.success ? 'alert-success' : 'alert-error'}`}
                style={{ 
                  margin: 0,
                  flex: 1,
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                <div style={{ 
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  marginTop: '0.125rem'
                }}>
                  {connectionStatus.success ? '✅' : '❌'}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {connectionStatus.success ? 'Port Connection Successful' : 'Port Connection Failed'}
                  </strong>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    opacity: 0.9,
                    whiteSpace: 'pre-line',
                    lineHeight: '1.6'
                  }}>
                    {connectionStatus.message}
                    {connectionStatus.detectedNetwork && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem',
                        background: 'rgba(251, 146, 60, 0.15)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(251, 146, 60, 0.4)',
                        fontSize: '0.85rem'
                      }}>
                        <strong>⚠️ {connectionStatus.detectedNetwork}</strong>
                        <div style={{ marginTop: '0.5rem', opacity: 0.9 }}>
                          Your network configuration suggests you're on a VPN or corporate network, which commonly block SMTP ports.
                        </div>
                      </div>
                    )}
                    {connectionStatus.suggestion && (
                      <div style={{ marginTop: '0.5rem', fontWeight: 500 }}>
                        💡 {connectionStatus.suggestion}
                      </div>
                    )}
                    {connectionStatus.success === false && connectionStatus.message.includes('timeout') && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>🔧 Quick Fix Options:</strong>
                        <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                          {connectionStatus.detectedNetwork && (
                            <>
                              <li><strong>Disconnect VPN</strong> (if connected) and test again</li>
                              <li><strong>Use mobile hotspot</strong> to test if it's a network restriction</li>
                              <li><strong>Contact IT admin</strong> if on corporate network to whitelist SMTP ports</li>
                            </>
                          )}
                          <li>Open PowerShell as Administrator and run:
                            <code style={{ 
                              display: 'block', 
                              marginTop: '0.25rem',
                              padding: '0.5rem',
                              background: 'rgba(0,0,0,0.3)',
                              borderRadius: '0.25rem',
                              fontSize: '0.8rem'
                            }}>
                              New-NetFirewallRule -DisplayName "Allow SMTP 587" -Direction Outbound -LocalPort 587 -Protocol TCP -Action Allow
                            </code>
                          </li>
                          <li>Test from a different network (mobile hotspot)</li>
                          <li>Check if your antivirus is blocking SMTP ports</li>
                          <li>Contact your IT/Network admin if on corporate network</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
            {smtpStatus && (
              <div 
                className={`alert ${smtpStatus.success ? 'alert-success' : 'alert-error'}`}
                style={{ 
                  margin: 0,
                  flex: 1,
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                <div style={{ 
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  marginTop: '0.125rem'
                }}>
                  {smtpStatus.success ? '✅' : '❌'}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {smtpStatus.success ? 'SMTP Connection Verified' : 'Connection Failed'}
                  </strong>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    opacity: 0.9,
                    whiteSpace: 'pre-line',
                    lineHeight: '1.6'
                  }}>
                    {smtpStatus.message}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Bulk Email Sending</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Send To</label>
            <select
              className="form-select"
              value={formData.toType}
              onChange={(e) => setFormData({ ...formData, toType: e.target.value })}
              disabled={loading}
            >
              <option value="repository">Specific repository</option>
              <option value="custom">Custom email list</option>
            </select>
            <div className="form-help">Repository mode allows per-repository sending with limits (max 500 per send)</div>
          </div>

          {formData.toType === 'repository' && (
            <>
              <div className="form-group">
                <label className="form-label">Repository</label>
                <select
                  className="form-select"
                  value={formData.repository}
                  onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
                  disabled={loading}
                  required
                >
                  <option value="">Select repository...</option>
                  {repositories.map(repo => (
                    <option key={repo} value={repo}>{repo}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Number of Emails to Send (Max 500)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="500"
                  value={formData.repositoryLimit}
                  onChange={(e) => {
                    const val = Math.min(parseInt(e.target.value) || 500, 500)
                    setFormData({ ...formData, repositoryLimit: val })
                  }}
                  disabled={loading}
                  required
                />
                <div className="form-help">
                  Maximum 500 emails per send. The system will send to emails that haven't been sent by this sender yet.
                </div>
              </div>
            </>
          )}

          {formData.toType === 'custom' && (
            <div className="form-group">
              <label className="form-label">Email Addresses (one per line)</label>
              <textarea
                className="form-textarea"
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                value={formData.customEmails}
                onChange={(e) => setFormData({ ...formData, customEmails: e.target.value })}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Email subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">HTML Template *</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '200px', fontFamily: 'monospace' }}
              placeholder={`Hello {{name}},&#10;&#10;Thank you for contributing to {{repository}}!&#10;&#10;Best regards`}
              value={formData.htmlTemplate}
              onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
              disabled={loading}
              required
            />
            <div className="form-help">
              Available variables: {'{{email}}'}, {'{{name}}'}, {'{{username}}'}, {'{{repository}}'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Plain Text Template (optional)</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '150px', fontFamily: 'monospace' }}
              placeholder="Plain text version of your email"
              value={formData.textTemplate}
              onChange={(e) => setFormData({ ...formData, textTemplate: e.target.value })}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Batch Size</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="20"
                value={formData.batchSize}
                onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                disabled={loading}
              />
              <div className="form-help">Number of emails to send per batch</div>
            </div>

            <div className="form-group">
              <label className="form-label">Delay (ms)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="10000"
                step="100"
                value={formData.delay}
                onChange={(e) => setFormData({ ...formData, delay: e.target.value })}
                disabled={loading}
              />
              <div className="form-help">Delay between batches in milliseconds</div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !formData.smtpHost || !formData.smtpUser || !formData.smtpPass}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Sending...
              </>
            ) : (
              'Send Emails'
            )}
          </button>
        </form>
      </div>

      {progress && (
        <div className="card mt-3 progress-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="progress-icon">📤</span>
              Sending Progress
            </h3>
          </div>
          <div className="progress-info">
            <div className="progress-message">{progress.message}</div>
            {progress.total > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Progress: {progress.sent + progress.failed} / {progress.total}</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress.percentage}%`,
                    height: '100%',
                    backgroundColor: progress.percentage === 100 ? '#10b981' : '#3b82f6',
                    transition: 'width 0.3s ease',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginTop: '0.75rem',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ color: '#10b981' }}>
                    ✅ Sent: {progress.sent}
                  </span>
                  {progress.failed > 0 && (
                    <span style={{ color: '#ef4444' }}>
                      ❌ Failed: {progress.failed}
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

export default SendEmails
