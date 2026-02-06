'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Record } from '@/lib/supabase'

interface H1BForumProps {
  records: Record[]
  excludeApproved: boolean
}

export default function H1BForum({ records: initialRecords, excludeApproved: initialExcludeApproved }: H1BForumProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [excludeApproved, setExcludeApproved] = useState(initialExcludeApproved)

  // Filter records based on the current excludeApproved state (client-side for instant feedback)
  const filteredRecords = useMemo(() => {
    return excludeApproved
      ? initialRecords.filter(record => record.status !== 'Clear')
      : initialRecords
  }, [initialRecords, excludeApproved])

  const handleFilterChange = (exclude: boolean) => {
    setExcludeApproved(exclude)
    const params = new URLSearchParams(searchParams.toString())
    if (exclude) {
      params.set('excludeApproved', 'true')
    } else {
      params.delete('excludeApproved')
    }
    // Update URL without full page reload for better UX
    router.push(`/forum?${params.toString()}`, { scroll: false })
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Clear':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Reject':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">H1B Application Notes</h3>
          <p className="text-sm text-gray-600">
            Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} with notes
          </p>
        </div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeApproved}
            onChange={(e) => handleFilterChange(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Exclude approved applications</span>
        </label>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No records found with notes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status || 'Unknown'}
                    </span>
                    {record.consulate && (
                      <span className="text-sm text-gray-600">📍 {record.consulate}</span>
                    )}
                    {record.waiting_days !== null && (
                      <span className="text-sm text-gray-600">
                        ⏱️ {record.waiting_days} day{record.waiting_days !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-x-4">
                    {record.check_date && (
                      <span>Check Date: {formatDate(record.check_date)}</span>
                    )}
                    {record.complete_date && record.complete_date !== '0000-00-00' && (
                      <span>Complete Date: {formatDate(record.complete_date)}</span>
                    )}
                    {record.month && (
                      <span>Month: {record.month}</span>
                    )}
                  </div>
                </div>
                {record.details_link && (
                  <Link
                    href={record.details_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium ml-4"
                  >
                    View Details →
                  </Link>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-gray-900 whitespace-pre-wrap">{record.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
