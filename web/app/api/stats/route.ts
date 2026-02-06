import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')

    // Get latest snapshot
    let snapshotQuery = supabase
      .from('snapshots')
      .select('*')
      .order('scrape_date', { ascending: false })
      .limit(1)

    if (month) {
      snapshotQuery = snapshotQuery.eq('month', month)
    }

    const { data: snapshots, error: snapshotError } = await snapshotQuery

    if (snapshotError || !snapshots || snapshots.length === 0) {
      return NextResponse.json({ error: 'No snapshots found' }, { status: 404 })
    }

    const snapshot = snapshots[0]
    const snapshotId = snapshot.id

    // Get all records for this snapshot
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('*')
      .eq('snapshot_id', snapshotId)

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    // Calculate statistics
    const total = records?.length || 0
    const statusCounts: Record<string, number> = {}
    const visaTypeCounts: Record<string, number> = {}
    const consulateCounts: Record<string, number> = {}
    const waitingDays: number[] = []

    records?.forEach(record => {
      // Status counts
      const status = record.status || 'Unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      // Visa type counts
      const visaType = record.visa_type || 'Unknown'
      visaTypeCounts[visaType] = (visaTypeCounts[visaType] || 0) + 1

      // Consulate counts
      const consulate = record.consulate || 'Unknown'
      consulateCounts[consulate] = (consulateCounts[consulate] || 0) + 1

      // Waiting days
      if (record.waiting_days !== null && record.waiting_days !== undefined) {
        waitingDays.push(record.waiting_days)
      }
    })

    const stats = {
      total_records: total,
      status_counts: statusCounts,
      visa_type_counts: visaTypeCounts,
      consulate_counts: consulateCounts,
      snapshot_id: snapshot.id,
      snapshot_date: snapshot.scrape_date,
      month: snapshot.month,
      avg_waiting_days: waitingDays.length > 0
        ? waitingDays.reduce((a, b) => a + b, 0) / waitingDays.length
        : null,
      min_waiting_days: waitingDays.length > 0 ? Math.min(...waitingDays) : null,
      max_waiting_days: waitingDays.length > 0 ? Math.max(...waitingDays) : null,
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
