import { useEffect, useRef } from "react";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import { formatRate } from "~/utils/format";
import type { RateHistoryPoint } from "~/utils/rateHistory";

// Registering only the line chart parts keeps the lazy chunk small.
Chart.register(
  CategoryScale,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

// Canvas cannot read CSS variables through Tailwind, so these mirror
// --color-accent, --color-line and --color-muted in globals.css.
const ACCENT = "#72cd75";
const LINE = "#20363c";
const MUTED = "#86a0a5";
const LONG_RANGE_DAYS = 180;

Chart.defaults.font.family =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fullDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function parseDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

// Ranges over half a year label months; shorter ones label days.
function isLongRange(chart: Chart) {
  const labels = chart.data.labels as string[];
  if (labels.length < 2) return false;

  const days =
    (parseDate(labels[labels.length - 1]).getTime() -
      parseDate(labels[0]).getTime()) /
    (1000 * 60 * 60 * 24);
  return days > LONG_RANGE_DAYS;
}

function createChartConfig(): ChartConfiguration<"line", number[], string> {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  return {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: ACCENT,
          borderWidth: 2,
          fill: "start",
          backgroundColor: ({ chart }) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return "transparent";

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom,
            );
            gradient.addColorStop(0, "rgba(114, 205, 117, 0.28)");
            gradient.addColorStop(1, "rgba(114, 205, 117, 0)");
            return gradient;
          },
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: ACCENT,
          pointHoverBorderColor: "#0f1b1e",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 300 },
      // Touching anywhere above a date shows its rate, not only the line.
      interaction: { mode: "index", intersect: false },
      plugins: {
        tooltip: {
          displayColors: false,
          backgroundColor: "#15252a",
          borderColor: LINE,
          borderWidth: 1,
          titleColor: MUTED,
          bodyColor: "#ffffff",
          bodyFont: { weight: "bold" },
          callbacks: {
            title: ([item]) => fullDateFormat.format(parseDate(item.label)),
            label: (item) => formatRate(item.parsed.y ?? 0),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: MUTED,
            font: { size: 11 },
            maxRotation: 0,
            maxTicksLimit: 4,
            callback(value) {
              const date = parseDate(this.getLabelForValue(Number(value)));
              return isLongRange(this.chart)
                ? monthFormat.format(date)
                : dayFormat.format(date);
            },
          },
        },
        y: {
          position: "right",
          grid: { color: LINE },
          border: { display: false },
          ticks: {
            color: MUTED,
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: (value) => formatRate(Number(value)),
          },
        },
      },
    },
  };
}

interface RateChartProps {
  label: string;
  points: RateHistoryPoint[];
}

// Chart.js line chart. The chart is created once and updated in place,
// so range and pair switches animate instead of redrawing a new canvas.
export function RateChart({ label, points }: RateChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line", number[], string>>(null);

  useEffect(() => {
    const chart = new Chart(canvasRef.current!, createChartConfig());
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.data.labels = points.map((point) => point.date);
    chart.data.datasets[0].data = points.map((point) => point.rate);
    chart.update();
  }, [points]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
