import React from 'react'

export default function ProgressBar({ answered, total }) {
  const pct = total > 0 ? (answered / total) * 100 : 0
  return (
    <div style={styles.track}>
      <div style={{ ...styles.fill, width: `${pct}%` }} />
      <span style={styles.label}>{answered}/{total}</span>
    </div>
  )
}

const styles = {
  track: {
    position: 'relative',
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    height: '100%',
    background: '#006633',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  label: {
    position: 'absolute',
    right: '4px',
    top: '-14px',
    fontSize: '10px',
    color: '#666',
  },
}
