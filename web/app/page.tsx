import Link from 'next/link'
import { Suspense } from 'react'
import StatsCard from '@/components/StatsCard'
import RecentChanges from '@/components/RecentChanges'
import StatusDistribution from '@/components/charts/StatusDistribution'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    // First, get the latest snapshot for each month
    // We'll use a raw SQL query since Supabase JS doesn't support DISTINCT ON directly
    const { data: latestSnapshots, error: snapshotsError } = await supabase
      .from('snapshots')
      .select('id, month, scrape_date, total_records')
      .order('scrape_date', { ascending: false })

    if (snapshotsError || !latestSnapshots) {
      console.error('Snapshots error:', snapshotsError)
      return null
    }

    // Group by month and keep only the latest snapshot for each month
    const latestByMonth = new Map<string, typeof latestSnapshots[0]>()
    for (const snapshot of latestSnapshots) {
      if (!latestByMonth.has(snapshot.month)) {
        latestByMonth.set(snapshot.month, snapshot)
      }
    }

    const latestSnapshotIds = Array.from(latestByMonth.values()).map(s => s.id)
    const months = Array.from(latestByMonth.keys()).sort()

    if (latestSnapshotIds.length === 0) {
      return null
    }

    // Get all records from only the latest snapshots for each month
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('*')
      .in('snapshot_id', latestSnapshotIds)

    if (recordsError) {
      console.error('Records error:', recordsError)
      return null
    }

    if (!records || records.length === 0) {
      return null
    }

    // Get the most recent snapshot date for metadata
    const mostRecentSnapshot = Array.from(latestByMonth.values())
      .sort((a, b) => new Date(b.scrape_date).getTime() - new Date(a.scrape_date).getTime())[0]

    // Calculate statistics from records in latest snapshots only
    const total = records.length
    const statusCounts: Record<string, number> = {}
    const visaTypeCounts: Record<string, number> = {}
    const consulateCounts: Record<string, number> = {}
    const waitingDays: number[] = []

    records.forEach(record => {
      const status = record.status || 'Unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      const visaType = record.visa_type || 'Unknown'
      visaTypeCounts[visaType] = (visaTypeCounts[visaType] || 0) + 1

      const consulate = record.consulate || 'Unknown'
      consulateCounts[consulate] = (consulateCounts[consulate] || 0) + 1

      if (record.waiting_days !== null && record.waiting_days !== undefined) {
        waitingDays.push(record.waiting_days)
      }
    })

    return {
      total_records: total,
      status_counts: statusCounts,
      visa_type_counts: visaTypeCounts,
      consulate_counts: consulateCounts,
      snapshot_id: mostRecentSnapshot?.id || null,
      snapshot_date: mostRecentSnapshot?.scrape_date || null,
      month: mostRecentSnapshot?.month || null,
      months_covered: months,
      avg_waiting_days: waitingDays.length > 0
        ? waitingDays.reduce((a, b) => a + b, 0) / waitingDays.length
        : null,
      min_waiting_days: waitingDays.length > 0 ? Math.min(...waitingDays) : null,
      max_waiting_days: waitingDays.length > 0 ? Math.max(...waitingDays) : null,
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return null
  }
}

async function getRecentChanges() {
  try {
    const { data: changes, error } = await supabase
      .from('changes')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Changes error:', error)
      return { changes: [] }
    }

    return { changes: changes || [] }
  } catch (error) {
    console.error('Error fetching changes:', error)
    return { changes: [] }
  }
}

export default async function Home() {
  const stats = await getStats()
  const { changes } = await getRecentChanges()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Checkee Tracker</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Overview
                </Link>
                <Link href="/trends" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
            <p className="text-gray-600">Monitor visa application processing status and trends</p>
          </div>

          {stats ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatsCard
                  title="Total Records"
                  value={stats.total_records}
                  subtitle={stats.months_covered ? `${stats.months_covered.length} months: ${stats.months_covered[0]} to ${stats.months_covered[stats.months_covered.length - 1]}` : 'All data'}
                />
                <StatsCard
                  title="Pending"
                  value={stats.status_counts?.Pending || 0}
                  subtitle={`${((stats.status_counts?.Pending || 0) / stats.total_records * 100).toFixed(1)}% of total`}
                  color="yellow"
                />
                <StatsCard
                  title="Cleared"
                  value={stats.status_counts?.Clear || 0}
                  subtitle={`${((stats.status_counts?.Clear || 0) / stats.total_records * 100).toFixed(1)}% of total`}
                  color="green"
                />
                <StatsCard
                  title="Avg Processing Days"
                  value={stats.avg_waiting_days ? Math.round(stats.avg_waiting_days) : 'N/A'}
                  subtitle={stats.avg_waiting_days ? `Range: ${stats.min_waiting_days}-${stats.max_waiting_days} days` : 'No data'}
                  color="blue"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                  <Suspense fallback={<div>Loading...</div>}>
                    <StatusDistribution
                      data={[
                        { name: 'Clear', value: stats.status_counts?.Clear || 0 },
                        { name: 'Pending', value: stats.status_counts?.Pending || 0 },
                        { name: 'Reject', value: stats.status_counts?.Reject || 0 },
                      ].filter(item => item.value > 0)}
                    />
                  </Suspense>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Top Consulates</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.consulate_counts || {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([consulate, count]) => (
                        <div key={consulate} className="flex justify-between items-center">
                          <span className="text-gray-700">{consulate}</span>
                          <span className="font-semibold">{count as number}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">No data available. Run the scraper to populate the database.</p>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Recent Changes</h3>
            <Suspense fallback={<div>Loading...</div>}>
              <RecentChanges changes={changes} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
