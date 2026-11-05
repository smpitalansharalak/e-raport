/**
 * Kunci cache React Query dipusatkan di sini agar invalidasi konsisten
 * dan tidak terjadi benturan antar fitur.
 */
export const queryKeys = {
  dashboard: {
    all: ['dashboard'],
    stats: (userId, role) => ['dashboard', 'stats', userId, role],
  },
  students: {
    all: ['students'],
    list: (filters) => ['students', 'list', filters],
    classes: (statusFilter) => ['students', 'classes', statusFilter],
  },
  users: {
    all: ['users'],
    list: (filters) => ['users', 'list', filters],
  },
  studentStatus: {
    all: ['student-status'],
    list: (filters) => ['student-status', 'list', filters],
    history: (studentId) => ['student-status', 'history', studentId],
  },
  reportPeriods: {
    all: ['report-periods'],
    list: (filters) => ['report-periods', 'list', filters],
    periodSubjects: (periodId) => ['report-periods', 'period-subjects', periodId],
  },
  kepatuhan: {
    all: ['kepatuhan'],
    periods: (userId, role) => ['kepatuhan', 'periods', userId, role],
  },
  cetakRapor: {
    all: ['cetak-rapor'],
    periods: (alumniMode) => ['cetak-rapor', 'periods', alumniMode],
    sheet: (periodId, alumniMode) => ['cetak-rapor', 'sheet', periodId, alumniMode],
  },
}
