import { useState, useEffect } from 'react'

// Standardstandort: Berlin, wenn Geolocation verweigert wird
const DEFAULT_LOCATION = { lat: 52.52, lon: 13.405 }

export function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation wird von diesem Browser nicht unterstützt.')
      setLocation(DEFAULT_LOCATION)
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setError('Standort nicht verfügbar – Berlin wird verwendet.')
        setLocation(DEFAULT_LOCATION)
        setLoading(false)
      },
      { timeout: 8000 }
    )
  }, [])

  return { location, error, loading }
}
