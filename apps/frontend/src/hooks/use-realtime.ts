"use client"

import { useEffect, useRef } from "react"

type EventMap = Partial<Record<string, (payload: any, raw: MessageEvent) => void>>

interface UseRealtimeOptions {
  /**
   * Map of event names → handler. Handlers receive the parsed payload (if JSON) and the raw event.
   */
  events: EventMap
  /**
   * Called once the connection opens.
   */
  onOpen?: (event: Event) => void
  /**
   * Called whenever the stream errors.
   */
  onError?: (event: Event) => void
  /**
   * URL override for the stream endpoint. Defaults to `/api/realtime/stream`.
   */
  url?: string
  /**
   * Automatically start the stream. Defaults to true.
   */
  enabled?: boolean
  /**
   * Include credentials (cookies). Defaults to true.
   */
  withCredentials?: boolean
}

export function useRealtimeStream({
  events,
  onOpen,
  onError,
  url,
  enabled = true,
  withCredentials = true,
}: UseRealtimeOptions) {
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
    const originBase =
      typeof window !== "undefined"
        ? window.location.origin.replace(/\/$/, "")
        : ""
    const baseUrl = url ?? `${envBase || originBase}/api/realtime/stream`

    if (!baseUrl) {
      console.warn("useRealtimeStream: unable to resolve stream URL")
      return
    }

    const source = new EventSource(baseUrl, { withCredentials })
    sourceRef.current = source

    if (onOpen) {
      source.addEventListener("open", onOpen as EventListener)
    }
    if (onError) {
      source.addEventListener("error", onError as EventListener)
    }

    const registeredEvents: Array<[string, EventListener]> = []

    Object.entries(events).forEach(([eventName, handler]) => {
      if (!handler) return
      const listener: EventListener = (event) => {
        if (!(event instanceof MessageEvent)) return
        let parsed: any = event.data
        try {
          parsed = JSON.parse(event.data)
        } catch {
          // fall back to raw string
        }
        handler(parsed, event)
      }
      source.addEventListener(eventName, listener, false)
      registeredEvents.push([eventName, listener])
    })

    return () => {
      if (onOpen) {
        source.removeEventListener("open", onOpen as EventListener)
      }
      if (onError) {
        source.removeEventListener("error", onError as EventListener)
      }

      registeredEvents.forEach(([eventName, listener]) => {
        source.removeEventListener(eventName, listener)
      })

      source.close()
      if (sourceRef.current === source) {
        sourceRef.current = null
      }
    }
  }, [enabled, events, onError, onOpen, url, withCredentials])

  return sourceRef.current
}


