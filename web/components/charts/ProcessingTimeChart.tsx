'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface ProcessingTimeChartProps {
  data: Array<{
    consulate: string
    avgDays: number
    minDays: number
    maxDays: number
  }>
  type?: 'bar' | 'line'
}

export default function ProcessingTimeChart({ data, type = 'bar' }: ProcessingTimeChartProps) {
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="consulate" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="avgDays" stroke="#3b82f6" name="Avg Days" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="consulate" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="avgDays" fill="#3b82f6" name="Average Days" />
      </BarChart>
    </ResponsiveContainer>
  )
}
