import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export type WeatherData = {
  available: boolean
  location?: string
  days?: {
    date: string
    condition: string
    iconUrl: string
    highF: number
    lowF: number
    chanceOfSnow: number
    totalSnowCm: number
    windMph: number
  }[]
  snow?: {
    totalSnowCm: number
    avgTempF: number
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const location = searchParams.get('location')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!location || !startDate) {
    return NextResponse.json({ available: false } satisfies WeatherData)
  }

  const apiKey = process.env.WEATHER_API_KEY
  if (!apiKey) {
    console.error('[weather] WEATHER_API_KEY not set')
    return NextResponse.json({ available: false } satisfies WeatherData)
  }

  const start = new Date(startDate)
  const now = new Date()
  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // WeatherAPI free tier only supports 14-day forecast
  if (daysUntil > 14) {
    return NextResponse.json({ available: false } satisfies WeatherData)
  }

  try {
    // Determine how many forecast days we need (up to 14)
    const end = endDate ? new Date(endDate) : start
    const forecastDays = Math.min(
      14,
      Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    )

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=${forecastDays}&aqi=no&alerts=no`
    const res = await fetch(url, { next: { revalidate: daysUntil <= 7 ? 3600 : 21600 } })

    if (!res.ok) {
      console.error('[weather] API error:', res.status, await res.text())
      return NextResponse.json({ available: false } satisfies WeatherData)
    }

    const data = await res.json()
    const forecastDaysList = data.forecast?.forecastday ?? []

    // Filter to only trip dates
    const tripStart = start.toISOString().split('T')[0]
    const tripEnd = end.toISOString().split('T')[0]

    const tripDays = forecastDaysList
      .filter((d: { date: string }) => d.date >= tripStart && d.date <= tripEnd)
      .map((d: { date: string; day: { maxtemp_f: number; mintemp_f: number; condition: { text: string; icon: string }; daily_chance_of_snow: number; totalsnow_cm: number; maxwind_mph: number } }) => ({
        date: d.date,
        condition: d.day.condition.text,
        iconUrl: `https:${d.day.condition.icon}`,
        highF: Math.round(d.day.maxtemp_f),
        lowF: Math.round(d.day.mintemp_f),
        chanceOfSnow: d.day.daily_chance_of_snow ?? 0,
        totalSnowCm: d.day.totalsnow_cm ?? 0,
        windMph: Math.round(d.day.maxwind_mph),
      }))

    // Aggregate snow stats
    const totalSnowCm = tripDays.reduce((sum: number, d: { totalSnowCm: number }) => sum + d.totalSnowCm, 0)
    const avgTempF = tripDays.length > 0
      ? Math.round(tripDays.reduce((sum: number, d: { highF: number; lowF: number }) => sum + (d.highF + d.lowF) / 2, 0) / tripDays.length)
      : 0

    const result: WeatherData = {
      available: tripDays.length > 0,
      location: data.location?.name,
      days: tripDays,
      snow: { totalSnowCm: Math.round(totalSnowCm * 10) / 10, avgTempF },
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[weather] fetch error:', err)
    return NextResponse.json({ available: false } satisfies WeatherData)
  }
}
