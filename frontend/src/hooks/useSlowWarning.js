import { useEffect, useState } from 'react'

/**
 * Returns a non-null warning string after `delayMs` of continuous loading.
 * Resets automatically when loading stops.
 *
 * Usage:
 *   const slowWarning = useSlowWarning(loading)
 *   {slowWarning && <p>{slowWarning}</p>}
 */
export default function useSlowWarning(
  loading,
  message = 'Large files can take a minute — still working…',
  delayMs = 8000
) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShow(false)
      return
    }
    const timer = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(timer)
  }, [loading, delayMs])

  return show ? message : null
}
