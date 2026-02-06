import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import H1BForum from '@/components/H1BForum'

export const dynamic = 'force-dynamic'

async function getH1BRecordsWithNotes(excludeApproved: boolean = true) {
  try {
    // Get the latest snapshot for each month
    const { data: snapshots, error: snapshotError } = await supabase
      .from('snapshots')
      .select('id, month, scrape_date, total_records')
      .order('scrape_date', { ascending: false })

    if (snapshotError || !snapshots) {
      console.error('Snapshots error:', snapshotError)
      return []
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
      return []
    }

    // Get H1B records with non-empty notes
    let recordsQuery = supabase
      .from('records')
      .select('*')
      .in('snapshot_id', latestSnapshotIds)
      .eq('visa_type', 'H1')
      .not('note', 'is', null)
      .neq('note', '')

    // Filter out approved applications if requested
    if (excludeApproved) {
      recordsQuery = recordsQuery.neq('status', 'Clear')
    }

    const { data: records, error: recordsError } = await recordsQuery

    if (recordsError) {
      console.error('Records error:', recordsError)
      return []
    }

    // Sort by most recent first (by check_date or created_at)
    const sortedRecords = (records || []).sort((a, b) => {
      const dateA = a.check_date ? new Date(a.check_date).getTime() : new Date(a.created_at).getTime()
      const dateB = b.check_date ? new Date(b.check_date).getTime() : new Date(b.created_at).getTime()
      return dateB - dateA
    })

    return sortedRecords
  } catch (error) {
    console.error('Error fetching H1B records with notes:', error)
    return []
  }
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: { excludeApproved?: string }
}) {
  const excludeApproved = searchParams.excludeApproved !== 'false'
  const records = await getH1BRecordsWithNotes(excludeApproved)

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
                <Link href="/trends" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Trends
                </Link>
                <Link href="/changes" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Changes
                </Link>
                <Link href="/forum" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  H1B Worker Forum
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">H1B Worker Forum</h2>
            <p className="text-gray-600">Notes and updates from H1B visa application records</p>
          </div>

          <H1BForum records={records} excludeApproved={excludeApproved} />
        </div>
      </main>
    </div>
  )
}
