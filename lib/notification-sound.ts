let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

export function playNotificationSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    // Mobile browsers suspend AudioContext until it's resumed from a user gesture
    if (ctx.state === "suspended") ctx.resume().catch(() => {})
    const beepAt = (offset: number) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.frequency.value = 880
      oscillator.type = "sine"
      const startTime = ctx.currentTime + offset
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.3)
    }
    // Double beep so it's easier to notice on a phone
    beepAt(0)
    beepAt(0.4)
  } catch {
    // Silently fail - user can add Notification.mp3 to public/sounds/ for custom sound
  }
}

// Must be called from within a user gesture (e.g. a button click) to unlock
// audio playback on mobile browsers that suspend AudioContext by default.
export function unlockNotificationAudio() {
  const ctx = getAudioContext()
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {})
  }
}
