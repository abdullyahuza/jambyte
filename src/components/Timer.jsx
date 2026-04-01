import React, { useState, useEffect, useRef } from 'react'

export default function Timer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expired = useRef(false)

  useEffect(() => {
    if (totalSeconds <= 0) return
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!expired.current) {
            expired.current = true
            onExpire()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [totalSeconds, onExpire])

  const hours = Math.floor(remaining / 3600)
  const mins = Math.floor((remaining % 3600) / 60)
  const secs = remaining % 60

  const isWarning = remaining < 300
  const isDanger = remaining < 60

  return (
    <div style={{
      ...styles.timer,
      background: isDanger ? '#cc0000' : isWarning ? '#e67e22' : 'rgba(255,255,255,0.2)',
    }}>
      <span style={styles.icon}>⏱</span>
      <span style={styles.time}>
        {hours > 0 && `${hours}:`}
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      {isWarning && <span style={styles.warn}>{isDanger ? 'HURRY!' : 'Running low'}</span>}
    </div>
  )
}

const styles = {
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    borderRadius: '20px',
    color: '#fff',
    fontWeight: '700',
  },
  icon: { fontSize: '14px' },
  time: { fontSize: '18px', fontFamily: 'monospace', letterSpacing: '2px' },
  warn: { fontSize: '11px', opacity: 0.9 },
}
