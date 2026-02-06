import Link from 'next/link'
import StatusChart from '@/components/charts/StatusChart'
import ProcessingTimeChart from '@/components/charts/ProcessingTimeChart'

async function getMonthlyStats() {
  // This would ideally aggregate data by month
  // For now, we'll get the latest snapshot stats
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stats`, {
    cache: 'no-store'
  })
  if (!res.ok) return null
  return res.json()
}

export default async function TrendsPage() {
  const stats = await getMonthlyStats()

  // Mock monthly data - in production, this would come from an API that aggregates by month
  const monthlyData = stats ? [
    {
      month: stats.month || '2026-02',
      pending: stats.status_counts?.Pending || 0,
      clear: stats.status_counts?.Clear || 0,
      reject: stats.status_counts?.Reject || 0,
      total: stats.total_records || 0,
    }
  ] : []

  const consulateData = stats ? Object.entries(stats.consulate_counts || {})
    .map(([consulate, count]) => ({
      consulate,
      count: count as number,
      avgDays: stats.avg_waiting_days || 0, // Would need to calculate per consulate
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) : []

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
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Trends & Analytics</h2>

          {stats ? (
            <>
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-4">Status Trends by Month</h3>
                <StatusChart data={monthlyData} />
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Processing Time by Consulate</h3>
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
