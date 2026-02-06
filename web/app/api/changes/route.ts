import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const since = searchParams.get('since') // ISO date string
    const month = searchParams.get('month')
    const changeType = searchParams.get('change_type')
    const limit = parseInt(searchParams.get('limit') || '100')

    let changesQuery = supabase
      .from('changes')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (since) {
      changesQuery = changesQuery.gte('detected_at', since)
    }

    if (changeType) {
      changesQuery = changesQuery.eq('change_type', changeType)
    }

    const { data: changes, error } = await changesQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter by month if specified (requires checking snapshot month)
    let filteredChanges = changes || []
    if (month) {
      const { data: snapshots } = await supabase
        .from('snapshots')
        .select('id')
        .eq('month', month)

      const snapshotIds = new Set(snapshots?.map(s => s.id) || [])
      filteredChanges = filteredChanges.filter(
        c => snapshotIds.has(c.snapshot_id_new)
      )
    }

    return NextResponse.json({ changes: filteredChanges })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
