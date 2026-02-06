import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const consulate = searchParams.get('consulate')
    const visaType = searchParams.get('visa_type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get latest snapshot for the month (or overall)
    let snapshotQuery = supabase
      .from('snapshots')
      .select('id')
      .order('scrape_date', { ascending: false })
      .limit(1)

    if (month) {
      snapshotQuery = snapshotQuery.eq('month', month)
    }

    const { data: snapshots, error: snapshotError } = await snapshotQuery

    if (snapshotError || !snapshots || snapshots.length === 0) {
      return NextResponse.json({ records: [], error: 'No snapshots found' }, { status: 404 })
    }

    const snapshotId = snapshots[0].id

    // Get records for this snapshot
    let recordsQuery = supabase
      .from('records')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .limit(limit)

    if (consulate) {
      recordsQuery = recordsQuery.eq('consulate', consulate)
    }
    if (visaType) {
      recordsQuery = recordsQuery.eq('visa_type', visaType)
    }
    if (status) {
      recordsQuery = recordsQuery.eq('status', status)
    }

    const { data: records, error: recordsError } = await recordsQuery

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    return NextResponse.json({ records: records || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
