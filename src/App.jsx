import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CollectEmails from './pages/CollectEmails.jsx'
import ViewEmails from './pages/ViewEmails.jsx'
import SendEmails from './pages/SendEmails.jsx'
import Repositories from './pages/Repositories.jsx'
import './styles/components.css'
import './styles/pages.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collect" element={<CollectEmails />} />
          <Route path="/emails" element={<ViewEmails />} />
          <Route path="/send" element={<SendEmails />} />
          <Route path="/repositories" element={<Repositories />} />
        </Routes>
      </Layout>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e2742',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#e2e8f0',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#e2e8f0',
            },
          },
        }}
      />
    </Router>
  )
}

export default App
