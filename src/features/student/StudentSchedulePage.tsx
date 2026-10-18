import { useState } from 'react'
import { useStudentSchedule } from './useStudentSessions'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { copy } from '../../lib/copy'

export function StudentSchedulePage() {
  const { data: sessions, isLoading, isOnline, lastUpdated } = useStudentSchedule()
  const [view, setView] = useState<'minggu' | 'bulan'>('minggu')

  return (
    <div className="space-y-4">
      {!isOnline && lastUpdated && (
        <div className="border border-neutral-900 bg-neutral-100 p-3 text-xs font-medium text-neutral-800">
          {copy.offline.banner(lastUpdated)}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Jadwal Kuliah</h1>
        <div className="flex border border-neutral-900">
          <button
            type="button"
            onClick={() => setView('minggu')}
            className={`min-h-11 px-3 text-xs font-medium ${
              view === 'minggu' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
            }`}
          >
            Minggu
          </button>
          <button
            type="button"
            onClick={() => setView('bulan')}
            className={`min-h-11 px-3 text-xs font-medium ${
              view === 'bulan' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
            }`}
          >
            Bulan
          </button>
        </div>
      </div>

      {isLoading && !sessions ? (
        <p className="text-sm text-neutral-600">Memuat jadwal...</p>
      ) : view === 'minggu' ? (
        <WeekView sessions={sessions ?? []} />
      ) : (
        <MonthView sessions={sessions ?? []} />
      )}
    </div>
  )
}