import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function GradesChart({ grades }) {
    if (!grades || grades.length === 0) {
        return <p>Нет данных для графика</p>;
    }

    const labels = grades.map((g) => g[2]); // предмет
    const values = grades.map((g) => g[4]); // балл

    const data = {
        labels,
        datasets: [
            {
                label: "Оценки",
                data: values,
                borderWidth: 1
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: true },
            title: { display: true, text: "Оценки по предметам" }
        }
    };

    return <Bar data={data} options={options} />;
}

export default GradesChart;