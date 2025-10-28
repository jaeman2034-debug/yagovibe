import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Title,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

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
    backgroundColor = "rgba(59,130,246,0.5)",
    borderColor = "rgba(59,130,246,1)"
}: AdminChartProps) {
    const data = {
        labels,
        datasets: [
            {
                label: "활동 지표",
                data: dataValues,
                backgroundColor,
                borderColor,
                borderWidth: 2,
                borderRadius: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: title,
                font: { size: 18, weight: "700" as const }
            },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                padding: 12,
                titleFont: { size: 14, weight: "bold" as const },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 10 },
                grid: {
                    color: "rgba(0, 0, 0, 0.05)"
                }
            },
            x: {
                grid: { display: false },
                ticks: {
                    font: { size: 12 }
                }
            },
        },
    };

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 mt-4 border border-gray-100">
            <Bar data={data} options={options} />
        </div>
    );
}

