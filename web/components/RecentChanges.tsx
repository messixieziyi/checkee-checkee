'use client'

import { format } from 'date-fns'

interface Change {
  id: string
  casenum: string
  change_type: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  detected_at: string
}

interface RecentChangesProps {
  changes: Change[]
}

const changeTypeLabels: Record<string, string> = {
  status_change: 'Status Changed',
  date_update: 'Date Updated',
  note_added: 'Note Added',
  note_updated: 'Note Updated',
  new_record: 'New Record',
  waiting_days_update: 'Waiting Days Updated',
}

export default function RecentChanges({ changes }: RecentChangesProps) {
  if (!changes || changes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent changes detected
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Case #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Change Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Detected
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {changes.map((change) => (
            <tr key={change.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {change.casenum}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {changeTypeLabels[change.change_type] || change.change_type}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {change.field_name && (
                  <div>
                    <span className="font-medium">{change.field_name}:</span>{' '}
                    {change.old_value && (
                      <span className="text-red-600 line-through">{change.old_value}</span>
                    )}
                    {change.old_value && change.new_value && ' → '}
                    {change.new_value && (
                      <span className="text-green-600">{change.new_value}</span>
                    )}
                  </div>
                )}
                {!change.field_name && change.new_value && (
                  <span>{change.new_value}</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {format(new Date(change.detected_at), 'MMM d, yyyy HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
