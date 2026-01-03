// Time formatting utilities for consistent display across charts
export const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '0 min 0 sec'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  return `${minutes} min ${remainingSeconds} sec`
}

export const formatMinutesSeconds = (seconds) => {
  if (!seconds || seconds <= 0) return '0:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const formatDecimalMinutes = (seconds) => {
  if (!seconds || seconds <= 0) return '0.00'
  
  return (seconds / 60).toFixed(2)
}

// Parse date, hour, minute into a proper Date object
export const parseSessionTime = (date, hour, minute) => {
  return new Date(`${date} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`)
}

// Format session date and time for display
export const formatSessionDateTime = (date, hour, minute) => {
  const sessionDate = parseSessionTime(date, hour, minute)
  return sessionDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}