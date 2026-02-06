import Link from 'next/link'
import StatusChart from '@/components/charts/StatusChart'
import ProcessingTimeChart from '@/components/charts/ProcessingTimeChart'
import VisaTypeFilter from '@/components/VisaTypeFilter'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getAvailableVisaTypes() {
  try {
    const { data: records } = await supabase
      .from('records')
      .select('visa_type')
      .not('visa_type', 'is', null)

    if (!records) return []

    const visaTypes = new Set<string>()
    records.forEach(record => {
      if (record.visa_type) {
        visaTypes.add(record.visa_type)
      }
    })

    return Array.from(visaTypes).sort()
  } catch (error) {
    console.error('Error fetching visa types:', error)
    return []
  }
}

async function getMonthlyStats(visaTypeFilter: string | null = null) {
  try {
    // Get the latest snapshot for each month
    const { data: snapshots, error: snapshotError } = await supabase
      .from('snapshots')
      .select('id, month, scrape_date, total_records')
      .order('scrape_date', { ascending: false })

    if (snapshotError || !snapshots) {
      return null
    }

    // Group by month and keep only the latest snapshot for each month
    const latestByMonth = new Map<string, typeof snapshots[0]>()
    for (const snapshot of snapshots) {
      if (!latestByMonth.has(snapshot.month)) {
        latestByMonth.set(snapshot.month, snapshot)
      }
    }

    const latestSnapshotIds = Array.from(latestByMonth.values()).map(s => s.id)

    if (latestSnapshotIds.length === 0) {
      return null
    }

    // Get all records from only the latest snapshots for each month
    let recordsQuery = supabase
      .from('records')
      .select('*')
      .in('snapshot_id', latestSnapshotIds)

    // Apply visa type filter if specified
    if (visaTypeFilter) {
      recordsQuery = recordsQuery.eq('visa_type', visaTypeFilter)
    }

    const { data: records, error: recordsError } = await recordsQuery

    if (recordsError) {
      return null
    }

    // Group records by month and calculate stats per month
    const monthlyStats = new Map<string, {
      month: string
      pending: number
      clear: number
      reject: number
      total: number
      avgWaitingDays: number
    }>()

    const consulateStats = new Map<string, {
      consulate: string
      totalCount: number
      totalWaitingDays: number
      recordCount: number
    }>()

    records?.forEach(record => {
      const month = record.month || 'Unknown'
      const status = record.status || 'Unknown'
      const consulate = record.consulate || 'Unknown'

      // Initialize month stats if not exists
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, {
          month,
          pending: 0,
          clear: 0,
          reject: 0,
          total: 0,
          avgWaitingDays: 0,
        })
      }

      const monthStat = monthlyStats.get(month)!
      monthStat.total++

      if (status === 'Pending') monthStat.pending++
      else if (status === 'Clear') monthStat.clear++
      else if (status === 'Reject') monthStat.reject++

      // Track waiting days for average calculation
      if (record.waiting_days !== null && record.waiting_days !== undefined) {
        monthStat.avgWaitingDays += record.waiting_days
      }

      // Consulate stats
      if (!consulateStats.has(consulate)) {
        consulateStats.set(consulate, {
          consulate,
          totalCount: 0,
          totalWaitingDays: 0,
          recordCount: 0,
        })
      }

      const consulateStat = consulateStats.get(consulate)!
      consulateStat.totalCount++
      if (record.waiting_days !== null && record.waiting_days !== undefined) {
        consulateStat.totalWaitingDays += record.waiting_days
        consulateStat.recordCount++
      }
    })

    // Calculate averages
    monthlyStats.forEach(stat => {
      const monthRecords = records?.filter(r => r.month === stat.month) || []
      const waitingDays = monthRecords
        .map(r => r.waiting_days)
        .filter((d): d is number => d !== null && d !== undefined)
      stat.avgWaitingDays = waitingDays.length > 0
        ? waitingDays.reduce((a, b) => a + b, 0) / waitingDays.length
        : 0
    })

    const monthlyData = Array.from(monthlyStats.values())
      .sort((a, b) => a.month.localeCompare(b.month))

    const consulateData = Array.from(consulateStats.values())
      .map(c => ({
        consulate: c.consulate,
        count: c.totalCount,
        avgDays: c.recordCount > 0 ? c.totalWaitingDays / c.recordCount : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      monthlyData,
      consulateData,
    }
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    return null
  }
}

export default async function TrendsPage() {
  const stats = await getMonthlyStats()

  const monthlyData = stats?.monthlyData || []
  const consulateData = stats?.consulateData || []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-900">Checkee Tracker</Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Overview
                </Link>
                <Link href="/trends" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Trends
                </Link>
                <Link href="/changes" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Changes
                </Link>
                <Link href="/forum" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  H1B Worker Forum
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Trends & Analytics</h2>

          {stats && monthlyData.length > 0 ? (
            <>
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-4">Status Trends by Month</h3>
                <StatusChart data={monthlyData} />
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Processing Time by Consulate (Top 10)</h3>
                <ProcessingTimeChart data={consulateData.map(c => ({
                  consulate: c.consulate,
                  avgDays: c.avgDays,
                  minDays: 0,
                  maxDays: 0,
                }))} />
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">No data available. Run the scraper to populate the database.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
