import {renderBarChart, renderLineChart, type TrendSeries} from "../charts";

const chartCleanups = new WeakMap<HTMLElement, () => void>();

/** Explicitly released before replacing a surface, closing it or unloading. */
export function disposeResponsiveCharts(root: HTMLElement): void {
    chartCleanups.get(root)?.();
    chartCleanups.delete(root);
}

/** The SVG viewport and viewBox share CSS-pixel dimensions. Resize the plot's
 * coordinates, never its text or stroke. Observing the SVG also handles folds
 * being opened and resized docks without a global window resize listener. */
export function bindResponsiveCharts(root: HTMLElement): void {
    disposeResponsiveCharts(root);
    const charts = Array.from(root.querySelectorAll<SVGSVGElement>("svg[data-responsive-chart]"));
    if (!charts.length) return;
    const data = new Map<SVGSVGElement, {kind: "line" | "bar"; series: TrendSeries; labelStride?: number}>();
    const sizes = new WeakMap<SVGSVGElement, string>();
    for (const chart of charts) {
        const raw = chart.getAttribute("data-responsive-chart");
        if (raw) data.set(chart, JSON.parse(raw));
    }
    let disposed = false;
    const redraw = (chart: SVGSVGElement, width: number, height: number): void => {
        if (disposed || !chart.isConnected || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return;
        const config = data.get(chart);
        if (!config) return;
        const key = `${width},${height}`;
        if (sizes.get(chart) === key) return;
        sizes.set(chart, key);
        const render = config.kind === "line" ? renderLineChart : renderBarChart;
        const svg = render(config.series, {width, height, labelStride: config.labelStride, responsive: false});
        chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
        chart.innerHTML = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
    };
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(entries => {
        for (const entry of entries) {
            const chart = entry.target as SVGSVGElement;
            if (!chart.isConnected) { observer?.unobserve(chart); data.delete(chart); continue; }
            redraw(chart, entry.contentRect.width, entry.contentRect.height);
        }
    });
    for (const chart of charts) {
        // Computed dimensions (unlike transformed bounding boxes) also work in
        // SiYuan's zoomed dialog, where a CSS pixel is not a viewport pixel.
        const style = getComputedStyle(chart);
        redraw(chart, parseFloat(style.width), parseFloat(style.height));
        observer?.observe(chart);
    }
    chartCleanups.set(root, () => { disposed = true; observer?.disconnect(); data.clear(); });
}
