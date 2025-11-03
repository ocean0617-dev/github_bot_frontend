# GitHub Email Collector - Frontend

React + Vite frontend for the GitHub Email Collector application.

## Features

- ⚡ **Fast Development** - Vite provides instant hot module replacement (HMR)
- 🎨 **Modern UI** - Dark-themed, responsive design
- 🔄 **Real-time Updates** - WebSocket integration for live progress
- 📱 **Responsive** - Works on all device sizes

## Tech Stack

- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

Build for production:

```bash
npm run build
```

The production build will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file (optional - defaults work with proxy):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Project Structure

```
src/
├── components/      # Reusable components
├── pages/          # Page components
├── styles/         # CSS files
├── utils/          # Utility functions (API, Socket.IO)
├── App.jsx         # Main app component
└── main.jsx        # Entry point
```

## Vite Configuration

The Vite config includes:
- React plugin
- Proxy configuration for API and Socket.IO
- Port 3000 for dev server

See `vite.config.js` for details.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
