import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface AdminChartProps {
    title: string;
    labels: string[];
    dataValues: number[];
    backgroundColor?: string;
    borderColor?: string;
}

export default function AdminChart({
    title,
    labels,
    dataValues,
    backgroundColor = "#3b82f6",
    borderColor = "#3b82f6"
}: AdminChartProps) {
    const chartData = labels.map((label, index) => ({
        name: label,
        value: dataValues[index] || 0,
    }));

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 mt-4 border border-gray-100">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
            <div className="h-64">
                <BarChart width={800} height={256} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#6B7280"
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                        stroke="#6B7280"
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                        contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            padding: '12px'
                        }}
                    />
                    <Bar 
                        dataKey="value" 
                        fill={backgroundColor}
                        stroke={borderColor}
                        strokeWidth={2}
                        radius={[6, 6, 0, 0]}
                    />
                </BarChart>
            </div>
        </div>
    );
}

