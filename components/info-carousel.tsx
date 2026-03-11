'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Timer,
  CloudSnow,
  Cloud,
  Sun,
  Lightbulb,
  UserX,
  Mountain,
  Thermometer,
  Wind,
  Calendar,
  Flame,
} from 'lucide-react'
import type { WeatherData } from '@/app/api/event/weather/route'

type InfoCarouselProps = {
  event: {
    id: string
    location: string | null
    mountains: string | null
    startDate: Date | null
    endDate: Date | null
    year: number
    status: string
  }
  activityType: string
  attendees: { userId: string; bookingStatus: string }[]
  attendeeUsers: { id: string; name: string | null }[]
  loreCount: number
  itineraryCount: number
  cachedTips: string[] | null
  ritualSlug: string
  todayItinerary?: { themeName: string | null; notes: string | null }[] | null
}

type CarouselCard = {
  id: string
  icon: React.ReactNode
  label: string
  content: React.ReactNode
  gradient: string
}

const HYPE_QUOTES: Record<string, string[]> = {
  ski: [
    'No friends on a powder day.',
    'Shred today — tomorrow you could be dead.',
    'If you\'re not falling, you\'re not trying.',
    'Earn your turns.',
    'Send it or spend the rest of your life wondering.',
    'The mountain doesn\'t care about your excuses.',
    'Ski hard or go home.',
  ],
  golf: [
    'Grip it and rip it.',
    'Drive for show, putt for dough.',
    'Every shot counts. Make them all count double.',
    'The course doesn\'t play itself.',
    'Fairways and greens, boys.',
    'Play it as it lies.',
  ],
  generic: [
    'You\'re not here to play it safe.',
    'Make it a story worth telling.',
    'Leave nothing in the tank.',
    'This is what you came for.',
    'Go big or go home.',
    'Today is the day.',
    'No regrets. Full send.',
  ],
}

export function InfoCarousel({
  event,
  activityType,
  attendees,
  attendeeUsers,
  cachedTips,
  todayItinerary,
}: InfoCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [tips, setTips] = useState<string[] | null>(cachedTips)
  const [tipsLoading, setTipsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch weather
  useEffect(() => {
    if (!event.location || !event.startDate) return
    const params = new URLSearchParams({
      location: event.location,
      startDate: new Date(event.startDate).toISOString(),
      ...(event.endDate && { endDate: new Date(event.endDate).toISOString() }),
      ...(activityType && { activityType }),
    })
    fetch(`/api/event/weather?${params}`)
      .then((r) => r.json())
      .then((data) => setWeather(data))
      .catch(() => setWeather({ available: false }))
  }, [event.location, event.startDate, event.endDate, activityType])

  // Fetch tips if not cached
  useEffect(() => {
    if (tips || tipsLoading || !event.location) return
    setTipsLoading(true)
    fetch('/api/event/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: event.id,
        location: event.location,
        activityType,
        mountains: event.mountains,
        startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
      }),
    })
      .then((r) => r.json())
      .then((data) => setTips(data.tips?.length > 0 ? data.tips : null))
      .catch(() => setTips(null))
      .finally(() => setTipsLoading(false))
  }, [event.id, event.location, event.mountains, event.startDate, activityType, tips, tipsLoading])

  // Build cards
  const cards: CarouselCard[] = []

  // Today's Itinerary card (in_progress only, inserted first)
  if (event.status === 'in_progress' && todayItinerary && todayItinerary.length > 0) {
    const hasTheme = todayItinerary.some((it) => it.themeName)
    cards.push({
      id: 'today-itinerary',
      icon: <Calendar size={14} />,
      label: 'TODAY',
      gradient: 'from-purple-500/15 to-purple-500/5',
      content: (
        <div className="flex flex-col gap-1">
          {todayItinerary.map((it, i) => (
            <div key={i}>
              {it.themeName && (
                <p className="text-lg font-bold text-[var(--fg)]">{it.themeName}</p>
              )}
              {it.notes && (
                <p className={`text-xs text-[var(--fg-muted)] ${hasTheme ? '' : 'text-sm'}`}>{it.notes}</p>
              )}
            </div>
          ))}
        </div>
      ),
    })
  }

  // 1. Countdown
  if (event.startDate) {
    const start = new Date(event.startDate)
    const now = new Date()
    const diffMs = start.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (event.status === 'in_progress') {
      const endDate = event.endDate ? new Date(event.endDate) : start
      const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
      const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
      const tripDay = Math.max(1, Math.floor((nowUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1)
      const totalDays = Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1
      cards.push({
        id: 'countdown',
        icon: <Timer size={14} />,
        label: 'LIVE',
        gradient: 'from-blue-500/15 to-blue-500/5',
        content: (
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-bold text-[var(--fg)]">Day {tripDay} of {totalDays}</p>
            <p className="text-xs text-[var(--fg-muted)]">Make it count.</p>
          </div>
        ),
      })
    } else if (diffDays > 0) {
      const message =
        diffDays <= 3 ? 'Final countdown — pack your bags!' :
        diffDays <= 7 ? 'One week out. Time to get organized.' :
        diffDays <= 14 ? 'Two weeks out. Start planning.' :
        `${diffDays} days to go.`
      cards.push({
        id: 'countdown',
        icon: <Timer size={14} />,
        label: 'COUNTDOWN',
        gradient: 'from-amber-500/15 to-amber-500/5',
        content: (
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-bold text-[var(--fg)]">{diffDays} day{diffDays !== 1 ? 's' : ''}</p>
            <p className="text-xs text-[var(--fg-muted)]">{message}</p>
          </div>
        ),
      })
    }
  }

  // 2. Weather / Snow Report
  if (weather?.available && weather.days && weather.days.length > 0) {
    const isSki = activityType === 'ski'
    const hasSnow = weather.snow && weather.snow.totalSnowCm > 0

    if (isSki && hasSnow) {
      cards.push({
        id: 'snow',
        icon: <Mountain size={14} />,
        label: 'SNOW REPORT',
        gradient: 'from-sky-400/15 to-white/5',
        content: (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <CloudSnow size={24} className="text-sky-400" />
              <div>
                <p className="text-lg font-bold text-[var(--fg)]">{Math.round(weather.snow!.totalSnowCm)}cm</p>
                <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Expected snowfall</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-[var(--fg-muted)]">
              <span className="flex items-center gap-1"><Thermometer size={14} />{weather.snow!.avgTempF}°F avg</span>
              <span className="flex items-center gap-1"><Wind size={14} />{weather.days![0].windMph}mph</span>
            </div>
          </div>
        ),
      })
    }

    // General weather card (show for all activity types, or ski without snow)
    if (!isSki || !hasSnow) {
      const firstDay = weather.days[0]
      const isSnowy = firstDay.chanceOfSnow > 30
      const isSunny = firstDay.condition.toLowerCase().includes('sun') || firstDay.condition.toLowerCase().includes('clear')
      const WeatherIcon = isSnowy ? CloudSnow : isSunny ? Sun : Cloud

      cards.push({
        id: 'weather',
        icon: <WeatherIcon size={14} />,
        label: 'FORECAST',
        gradient: isSnowy ? 'from-sky-400/15 to-white/5' : isSunny ? 'from-yellow-400/10 to-orange-400/5' : 'from-gray-400/10 to-gray-400/5',
        content: (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={firstDay.iconUrl} alt={firstDay.condition} className="w-10 h-10" />
              <div>
                <p className="text-lg font-bold text-[var(--fg)]">{firstDay.highF}° / {firstDay.lowF}°F</p>
                <p className="text-xs text-[var(--fg-muted)]">{firstDay.condition}</p>
              </div>
            </div>
            {weather.days!.length > 1 && (
              <div className="flex gap-2 overflow-hidden">
                {weather.days!.slice(1, 4).map((d) => (
                  <div key={d.date} className="flex flex-col items-center text-xs text-[var(--fg-muted)]">
                    <span>{new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.iconUrl} alt={d.condition} className="w-6 h-6" />
                    <span>{d.highF}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      })
    }
  }

  // 3. AI Travel Tips (cycle through them as individual cards)
  if (tips && tips.length > 0) {
    cards.push({
      id: 'tips',
      icon: <Lightbulb size={14} />,
      label: 'TRAVEL TIP',
      gradient: 'from-amber-400/10 to-yellow-400/5',
      content: (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[var(--fg)] leading-relaxed">{tips[Math.floor(Date.now() / 30000) % tips.length]}</p>
        </div>
      ),
    })
  }

  // 4. Peer Pressure
  if (event.status === 'scheduled') {
    const uncommitted = attendees
      .filter((a) => a.bookingStatus === 'not_yet')
      .map((a) => {
        const user = attendeeUsers.find((u) => u.id === a.userId)
        return user?.name?.split(' ')[0] ?? null
      })
      .filter(Boolean)

    if (uncommitted.length > 0) {
      const names = uncommitted.length <= 3
        ? uncommitted.join(', ')
        : `${uncommitted.slice(0, 2).join(', ')} + ${uncommitted.length - 2} more`
      cards.push({
        id: 'pressure',
        icon: <UserX size={14} />,
        label: 'NUDGE',
        gradient: 'from-red-400/10 to-orange-400/5',
        content: (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--fg)]">{names}</p>
            <p className="text-xs text-[var(--fg-muted)]">
              {uncommitted.length === 1 ? "hasn't" : "haven't"} committed yet. Apply some peer pressure.
            </p>
          </div>
        ),
      })
    }
  }

  // 5. Motivational quote (in_progress only)
  if (event.status === 'in_progress' && event.startDate) {
    const start = new Date(event.startDate)
    const now = new Date()
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    const dayNum = Math.max(0, Math.floor((nowUtc - startUtc) / (1000 * 60 * 60 * 24)))
    const quotes = HYPE_QUOTES[activityType] ?? HYPE_QUOTES.generic
    const quote = quotes[dayNum % quotes.length]
    cards.push({
      id: 'hype',
      icon: <Flame size={14} />,
      label: 'SEND IT',
      gradient: 'from-red-500/15 to-orange-500/5',
      content: (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-[var(--fg)] italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
        </div>
      ),
    })
  }

  // Auto-rotation
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (cards.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % cards.length)
      }, 10000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  // Keep current in bounds
  useEffect(() => {
    if (current >= cards.length && cards.length > 0) {
      setCurrent(0)
    }
  }, [current, cards.length])

  if (cards.length === 0) return null

  const activeCard = cards[current] ?? cards[0]

  return (
    <div className="flex flex-col gap-2 min-h-[100px]">
      {/* Card */}
      <div className={`relative flex-1 rounded-lg bg-gradient-to-br ${activeCard.gradient} p-4 flex flex-col justify-between gap-3 transition-all duration-300`}>
        <div className="flex items-center gap-2 text-[var(--fg-muted)]">
          {activeCard.icon}
          <span className="text-xs uppercase tracking-widest font-medium">{activeCard.label}</span>
        </div>
        <div className="flex-1 flex items-center">
          {activeCard.content}
        </div>
      </div>

      {/* Dots */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-2">
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => { setCurrent(i); startTimer() }}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-5 h-2 bg-[var(--fg)]'
                  : 'w-2 h-2 bg-[var(--fg)]/30 hover:bg-[var(--fg)]/50'
              }`}
              aria-label={`Go to ${card.label}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
