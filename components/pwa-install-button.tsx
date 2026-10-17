'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [message, setMessage] = useState('')
  const [serviceWorkerError, setServiceWorkerError] = useState('')

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && Boolean(window.navigator.standalone))
    setInstalled(standalone)

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setMessage('Golden Star ERP is installed on this device.')
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((cause: unknown) => {
        const detail = cause instanceof Error ? cause.message : 'Unknown service worker registration error.'
        setServiceWorkerError(`App installation support could not be initialized: ${detail}`)
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function installApp() {
    setMessage('')
    if (!installPrompt) {
      const isAppleMobile = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
      setMessage(isAppleMobile
        ? 'To install, open this page in Safari, tap Share, then choose Add to Home Screen.'
        : 'Use your browser menu and choose Install app or Add to Home screen.')
      return
    }

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setMessage(choice.outcome === 'accepted'
        ? 'Golden Star ERP is being installed.'
        : 'Installation was cancelled. You can install it later from your browser menu.')
    } catch (cause) {
      setMessage(cause instanceof Error ? `The app could not be installed: ${cause.message}` : 'The app could not be installed. Try again from your browser menu.')
    } finally {
      setInstallPrompt(null)
    }
  }

  if (installed) return null

  return (
    <div className="pwa-install-control">
      <button type="button" className="outline-button" onClick={installApp} aria-label="Install Golden Star Media House ERP">
        <Download />{installPrompt ? 'Install app' : 'Install ERP app'}
      </button>
      {(message || serviceWorkerError) && <p className={serviceWorkerError ? 'pwa-install-message error' : 'pwa-install-message'} role="status">{serviceWorkerError || message}</p>}
    </div>
  )
}
