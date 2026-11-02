import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {GoogleOAuthProvider} from '@react-oauth/google'
import { shouldUseNewSite } from './siteVersion'

// Admins see the redesign, everyone else the current site. Each loads its own JS and CSS.
const loadApp = shouldUseNewSite() ? import('./AppEntry') : import('./legacy/entry')

loadApp.then(({ default: App }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
      <App />
      </GoogleOAuthProvider>
    </StrictMode>,
  )
})
