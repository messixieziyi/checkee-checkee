import Link from 'next/link'
import RecentChanges from '@/components/RecentChanges'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getChanges() {
  try {
    const { data: changes, error } = await supabase
      .from('changes')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(100)

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

export default async function ChangesPage() {
  const { changes } = await getChanges()

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
                <Link href="/changes" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Detection</h2>
            <p className="text-gray-600">Track updates and changes to visa application records</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <RecentChanges changes={changes} />
          </div>
        </div>
      </main>
    </div>
  )
}
