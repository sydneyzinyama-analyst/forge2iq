import { useEffect, useRef } from 'react'

/** Calls `callback` every `intervalMs` milliseconds while the component is mounted. */
export function useAutoRefresh(callback: () => void, intervalMs = 30000) {
  const ref = useRef(callback)
  ref.current = callback

  useEffect(() => {
    const id = setInterval(() => ref.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
