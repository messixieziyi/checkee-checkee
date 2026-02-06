'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface StatusChartProps {
  data: Array<{
    month: string
    pending: number
    clear: number
    reject: number
    total: number
  }>
}

export default function StatusChart({ data }: StatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
        <Bar dataKey="clear" stackId="a" fill="#10b981" name="Clear" />
        <Bar dataKey="reject" stackId="a" fill="#ef4444" name="Reject" />
      </BarChart>
    </ResponsiveContainer>
  )
}
