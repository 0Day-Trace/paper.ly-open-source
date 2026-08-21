import { useState, useEffect } from 'react'

export default function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light'
  )
  useEffect(() => {
    const mo = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme || 'light')
    )
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return theme
}
