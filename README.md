# KimiHome 🌌

KimiHome is a beautifully crafted, high-performance, and offline-first personal dashboard and developer startpage. Engineered with React 18, Vite, and Tailwind CSS v4, it transforms your browser's new tab page into a cohesive, ambient space focused on clarity, flow, and productivity.

---

## ✨ Key Features

- **🕒 Elegant Display Time & Custom Greeting**: Features an adaptive layout with custom pairing of display typography (Space Grotesk) and inline editing of your preferred display name (alex/kimi).
- **🌤️ Dynamic Geocoded Weather**: Interactive geolocation and search-supported weather dashboard utilizing WMO weather codes to provide clean illustrations, current temperatures, and a 5-day forecast.
- **🔖 High-Fidelity Quick Bookmarks**: Organized category board that automatically resolves and renders beautiful, high-quality website favicons using a robust, multi-stage fallback chain (Google, DuckDuckGo, Icon Horse), with support for custom overrode URLs.
- **⏱️ Ambient Pomodoro Focus Timer**: A circular focus ring styled with smooth transition arcs to manage work/break intervals, meticulously balanced for both mobile viewport ratios and desktop grids.
- **✅ Categorized Task Tracker**: Local todo checklist that supports custom categorization, streak awards, and progress tracking.
- **📝 Scratchpad Notes Widget**: A markdown-friendly notepad for transient ideas, lists, or commands that auto-saves to local storage instantly.
- **🎨 Responsive Customization Panel**: Fully optimized setting controls to toggle visibility of individual widgets, switch custom backgrounds (clean solids vs cosmic slate gradients), and manage data state.

---

## 🛠️ Technology Stack

- **Core Framework**: [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Engine**: [Vite](https://vite.dev/) (with fast container orchestration)
- **Styling Architecture**: [Tailwind CSS v4](https://tailwindcss.com/) (modern variables, utility-first fluid grids, high contrast)
- **Icons**: [Lucide React](https://lucide.dev/) (optimized, crisp SVG icon pairings)
- **Persistence Layer**: [HTML5 LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) (completely private, offline-first)

---

## 🚀 Getting Started

### 1. Installation

To run the dashboard locally, clone this project and install its dependencies:

```bash
# Clone the repository
git clone https://github.com/your-username/KimiHome.git

# Navigate to the workspace
cd KimiHome

# Install package dependencies
npm install
```

### 2. Run the Development Server

Start the local development server under port `3000`:

```bash
npm run dev
```

Your browser will automatically spin up the live preview interface at `http://localhost:3000`.

### 3. Production Build

Compile the application into static optimized web assets ready for host platforms:

```bash
npm run build
```

This will output the build bundle into the `dist/` directory.

---

## 🌐 Deployment Guide

Since KimiHome is a modern, static React application built with Vite, it can be hosted for free on any static hosting platform. Here is how to deploy it on the most popular services:

### ⚡ Cloudflare Pages

Cloudflare Pages is incredibly fast and offers unlimited bandwidth on their free tier.

#### Via GitHub/GitLab Integration (Recommended)
1. Push your code to a GitHub or GitLab repository.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
3. Click **Create** > **Pages** > **Connect to Git**.
4. Select your repository.
5. In the **Build settings**, configure:
   - **Framework preset**: `Vite` (if available, otherwise choose `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Click **Save and Deploy**.

#### Via Wrangler CLI (Direct Upload)
If you prefer deploying from your terminal:
```bash
# Install Wrangler globally or use npx
npm run build
npx wrangler pages deploy dist
```

---

### ▲ Vercel

Vercel provides seamless one-click deployments and serverless features.

#### Via Vercel Dashboard
1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Import your repository into the [Vercel Dashboard](https://vercel.com/new).
3. Vercel will automatically detect **Vite** as the framework.
4. Verify the settings are:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

#### Via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Run build and deploy
npm run build
vercel --prod
```

---

### 🐙 GitHub Pages

GitHub Pages allows you to host KimiHome directly from your GitHub repository.

#### Via GitHub Actions (Recommended)
1. Create a file named `.github/workflows/deploy.yml` in your repository:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
          
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```
2. Enable custom workflows in your repository settings under **Settings** > **Pages** > **Build and deployment** > **Source** -> change to **GitHub Actions**.
3. Push to `main` branch to trigger the deployment automatically.

#### Setting a Subpath Base (If needed)
If your GitHub Pages URL is like `https://username.github.io/repository-name/`, you **MUST** update your `vite.config.ts` to include the base path:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/repository-name/', // Add this line
  // ...other config
})
```

---

## 🔒 Security & Privacy

KimiHome is designed around an **Offline-First, Zero-Tracking** architecture. None of your bookmarks, tasks, notes, or search terms are ever sent to an external server. Everything resides securely in your browser's local sandbox storage, giving you full telemetry privacy and blazing-fast loading speeds under any network state.
