import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  API_BASE,
  DEFAULT_SERVER_CONFIG,
  mergeServerConfig,
} from '../config'

const ServerConfigContext = createContext(DEFAULT_SERVER_CONFIG)

export function ServerConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_SERVER_CONFIG)

  useEffect(() => {
    let cancelled = false
    axios.get(`${API_BASE}/config`, { timeout: 60000 })
      .then((res) => {
        if (!cancelled) setConfig(mergeServerConfig(res.data))
      })
      .catch(() => {
        if (!cancelled) setConfig({ ...DEFAULT_SERVER_CONFIG })
      })
    return () => { cancelled = true }
  }, [])

  const value = useMemo(() => config, [config])
  return (
    <ServerConfigContext.Provider value={value}>
      {children}
    </ServerConfigContext.Provider>
  )
}

export function useServerConfig() {
  return useContext(ServerConfigContext)
}
