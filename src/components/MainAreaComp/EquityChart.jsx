import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomLabel from './CustomLabel';

const EquityChart = ({ extractedData, isPreview, isExpanded }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart 
        data={extractedData} 
        margin={(isPreview && !isExpanded) ? { top: 10, right: 10, left: 10, bottom: 10 } : { top: 30, right: 40, left: 10, bottom: 40 }}
      >
        <defs>
          <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4a90e2" stopOpacity={(isPreview && !isExpanded) ? 0.6 : 0.4}/>
            <stop offset="95%" stopColor="#4a90e2" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="id" axisLine={false} tickLine={false} tick={false} hide={isPreview && !isExpanded} />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={(isPreview && !isExpanded) ? false : { fill: '#9ca3af', fontSize: 12, fontWeight: 500 }} 
          tickMargin={10}
          hide={isPreview && !isExpanded}
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={(isPreview && !isExpanded) ? "#f3f4f6" : "#e5e7eb"} />
        {(!isPreview || isExpanded) && (
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: '#4a90e2', fontWeight: 600 }}
          />
        )}
        <Area 
          type="monotone" 
          dataKey="cumulativeR" 
          stroke="#4a90e2" 
          strokeWidth={(isPreview && !isExpanded) ? 4 : 3} 
          fillOpacity={1} 
          fill="url(#colorR)"
          activeDot={(isPreview && !isExpanded) ? false : { r: 6, fill: '#4a90e2', stroke: 'white', strokeWidth: 2 }}
          dot={(isPreview && !isExpanded) ? false : { r: 3, fill: 'white', stroke: '#4a90e2', strokeWidth: 2 }}
          label={(isPreview && !isExpanded) ? null : <CustomLabel data={extractedData} />}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default EquityChart;
