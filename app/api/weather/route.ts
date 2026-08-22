import { NextResponse } from 'next/server';

const LAT = 39.0997;
const LON = -94.5786;
const NWS_HEADERS = {
  'User-Agent': 'NeighborlyKC/1.0 (https://neighborlykc.com)',
  Accept: 'application/geo+json',
};

type NwsPeriod = {
  startTime?: string;
  temperature?: number;
  temperatureUnit?: string;
  probabilityOfPrecipitation?: { value?: number | null };
  shortForecast?: string;
  windSpeed?: string;
  windDirection?: string;
};

export async function GET() {
  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${LAT},${LON}`, {
      headers: NWS_HEADERS,
      next: { revalidate: 21600 },
    });
    if (!pointRes.ok) throw new Error(`NWS point lookup failed: ${pointRes.status}`);
    const point = await pointRes.json();
    const hourlyUrl = point?.properties?.forecastHourly;
    if (!hourlyUrl) throw new Error('NWS hourly forecast URL missing');

    const hourlyRes = await fetch(hourlyUrl, {
      headers: NWS_HEADERS,
      next: { revalidate: 600 },
    });
    if (!hourlyRes.ok) throw new Error(`NWS hourly forecast failed: ${hourlyRes.status}`);
    const hourlyJson = await hourlyRes.json();
    const periods: NwsPeriod[] = hourlyJson?.properties?.periods || [];
    if (!periods.length) throw new Error('NWS hourly forecast was empty');

    const byDate = new Map<string, NwsPeriod[]>();
    for (const p of periods) {
      const date = p.startTime?.slice(0, 10);
      if (!date) continue;
      const list = byDate.get(date) || [];
      list.push(p);
      byDate.set(date, list);
    }

    const forecast = Array.from(byDate.entries()).slice(0, 7).map(([date, hours]) => {
      const temps = hours.map(h => Number(h.temperature)).filter(Number.isFinite);
      const precip = hours.map(h => Number(h.probabilityOfPrecipitation?.value ?? 0)).filter(Number.isFinite);
      const midday = hours.find(h => {
        const hour = Number(h.startTime?.slice(11, 13));
        return hour >= 11 && hour <= 14;
      }) || hours[0];
      return {
        date,
        high: Math.max(...temps),
        low: Math.min(...temps),
        precip: precip.length ? Math.max(...precip) : 0,
        summary: midday?.shortForecast || hours[0]?.shortForecast || 'Forecast',
        hours: hours.map(h => ({
          time: h.startTime,
          temp: Number(h.temperature),
          precip: Number(h.probabilityOfPrecipitation?.value ?? 0),
          summary: h.shortForecast || '',
          wind: `${h.windDirection || ''} ${h.windSpeed || ''}`.trim(),
        })),
      };
    });

    const current = periods[0];
    return NextResponse.json({
      source: 'National Weather Service',
      location: point?.properties?.relativeLocation?.properties?.city || 'Kansas City',
      current: {
        temp: Number(current.temperature),
        precip: Number(current.probabilityOfPrecipitation?.value ?? 0),
        summary: current.shortForecast || 'Forecast',
      },
      forecast,
      radarUrl: 'https://radar.weather.gov/ridge/standard/KEAX_loop.gif',
      radarPage: 'https://radar.weather.gov/station/KEAX/standard',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    console.error('NWS weather error', error);
    return NextResponse.json({ error: error?.message || 'Weather unavailable' }, { status: 502 });
  }
}
