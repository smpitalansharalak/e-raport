import { useCallback, useMemo, useState } from 'react'
import PeriodToolbar from './period-list/PeriodToolbar'
import PeriodYearGroup from './period-list/PeriodYearGroup'
import PeriodEmptyState from './period-list/PeriodEmptyState'
import {
  filterPeriods,
  groupPeriodsByYear,
  listAcademicYears,
} from '../reportListView'

const DEFAULT_VIEW = 'aktif'

/**
 * Daftar periode rapor: segmented Aktif/Arsip, filter, dan grup
 * accordion per tahun ajaran.
 *
 * State di komponen ini murni UI state (filter, accordion). Data dan
 * mutasi datang dari parent via props, sehingga komponen tidak pernah
 * melakukan fetch sendiri dan gampang dipakai ulang.
 */
export default function PeriodList({
  periods = [],
  periodSubjects,
  isTogglingArchive = false,
  onEditPeriod,
  onToggleArchive,
  onDeletePeriod,
  onManageSubjects,
}) {
  const [view, setView] = useState(DEFAULT_VIEW)
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  // undefined = pakai default (grup terbaru terbuka); boolean = pilihan user
  const [openYears, setOpenYears] = useState({})
  const isYearOpen = useCallback(
    (year, index) => openYears[year] ?? index === 0,
    [openYears],
  )

  const counts = useMemo(
    () => ({
      aktif: periods.filter((p) => p.is_active).length,
      arsip: periods.filter((p) => !p.is_active).length,
    }),
    [periods],
  )

  const scoped = useMemo(
    () => periods.filter((p) => (view === 'aktif' ? p.is_active : !p.is_active)),
    [periods, view],
  )

  const years = useMemo(() => listAcademicYears(scoped), [scoped])

  const filtered = useMemo(
    () => filterPeriods(scoped, { search, year: filterYear, semester: filterSemester }),
    [scoped, search, filterYear, filterSemester],
  )

  const groups = useMemo(() => groupPeriodsByYear(filtered), [filtered])

  const isFiltered = Boolean(search.trim() || filterYear || filterSemester)

  const resetFilters = useCallback(() => {
    setSearch('')
    setFilterYear('')
    setFilterSemester('')
  }, [])

  const toggleYear = useCallback(
    (year, index) => setOpenYears((prev) => ({ ...prev, [year]: !(prev[year] ?? index === 0) })),
    [],
  )

  if (periods.length === 0) {
    return <PeriodEmptyState variant="no-periods" />
  }

  return (
    <div className="space-y-4">
      <PeriodToolbar
        view={view}
        counts={counts}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        years={years}
        year={filterYear}
        onYearChange={setFilterYear}
        semester={filterSemester}
        onSemesterChange={setFilterSemester}
        onReset={resetFilters}
        isFiltered={isFiltered}
      />

      {groups.length === 0 ? (
        <PeriodEmptyState
          variant="no-results"
          onReset={isFiltered ? resetFilters : undefined}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group, index) => (
            <PeriodYearGroup
              key={group.year}
              year={group.year}
              periods={group.periods}
              open={isYearOpen(group.year, index)}
              onToggle={() => toggleYear(group.year, index)}
              periodSubjects={periodSubjects}
              isTogglingArchive={isTogglingArchive}
              onEditPeriod={onEditPeriod}
              onToggleArchive={onToggleArchive}
              onDeletePeriod={onDeletePeriod}
              onManageSubjects={onManageSubjects}
            />
          ))}
        </div>
      )}
    </div>
  )
}
