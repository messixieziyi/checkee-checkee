import Link from 'next/link'
import { Suspense } from 'react'
import StatsCard from '@/components/StatsCard'
import RecentChanges from '@/components/RecentChanges'
import StatusDistribution from '@/components/charts/StatusDistribution'

async function getStats() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stats`, {
    cache: 'no-store'
  })
  if (!res.ok) return null
  return res.json()
}

async function getRecentChanges() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/changes?limit=10`, {
    cache: 'no-store'
  })
  if (!res.ok) return { changes: [] }
  return res.json()
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
                  subtitle={`Latest snapshot: ${new Date(stats.snapshot_date).toLocaleDateString()}`}
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
