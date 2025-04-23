import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WeightHistory } from '../../types/workout';
import { format } from 'date-fns';
import { he } from 'date-fns/locale/he';

interface WeightHistoryChartProps {
  history: WeightHistory[];
  isVisible: boolean;
}

export const WeightHistoryChart: React.FC<WeightHistoryChartProps> = ({ history, isVisible }) => {
  if (!isVisible || !history || history.length === 0) {
    return null;
  }

  // Sort history by timestamp
  const sortedHistory = [...history].sort((a, b) => 
    a.timestamp.toMillis() - b.timestamp.toMillis()
  );

  // Format data for the chart
  const chartData = sortedHistory.map(item => ({
    date: format(item.timestamp.toDate(), 'dd/MM/yyyy', { locale: he }),
    weight: item.weight,
    notes: item.notes || ''
  }));

  return (
    <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
      <h4 className="text-lg font-medium mb-2">היסטוריית משקולות</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              label={{ value: 'תאריך', position: 'bottom' }}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'משקל (ק"ג)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value} ק"ג`, 'משקל']}
              labelFormatter={(label) => `תאריך: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 