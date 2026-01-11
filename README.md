# ZuGruppe - The Velvet Return

A modern real estate platform built with React, Vite, and Base44.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Base44 credentials:
   - `VITE_BASE44_APP_ID`: Your Base44 App ID
   - `VITE_BASE44_BACKEND_URL`: Your Base44 backend URL (e.g., `https://api.base44.com`)

3. **Run development server**
   ```bash
   npm run dev
   ```

## 📦 Deployment

### GitHub Pages

This project is configured to deploy automatically to GitHub Pages when you push to the `main` branch.

**Required GitHub Secrets:**

Go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VITE_BASE44_APP_ID` | Your Base44 App ID | `abc123def456` |
| `VITE_BASE44_BACKEND_URL` | Base44 API endpoint | `https://api.base44.com` |

After adding the secrets, trigger a new deployment by pushing to `main` or manually running the workflow.

## 🏗️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Base44** - Backend platform
- **Lucide React** - Icons
- **React Router** - Navigation

## 📁 Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── lib/           # Utilities and Base44 integration
│   ├── pages/         # Page components
│   └── App.jsx        # Main app component
├── functions/         # Base44 cloud functions
└── public/           # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 📝 License

Private project - All rights reserved
