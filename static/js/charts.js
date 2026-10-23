window.queueChartUpdater = {
    chart: null,
    init: function() {
        const ctx = document.getElementById('queueChart');
        if (!ctx) return;
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [0],
                datasets: [
                    { label: 'Fila A', data: [0], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: false, tension: 0.3 },
                    { label: 'Fila B', data: [0], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', fill: false, tension: 0.3 },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true },
                    x: { title: { display: true, text: 'Tiempo (s)' } },
                },
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } },
                },
            },
        });
    },
    updateChart: function(history) {
        if (!this.chart) this.init();
        if (!this.chart || !history || history.length === 0) return;

        const labels = history.map((point) => Number(point.time.toFixed(1)));
        const queueA = history.map((point) => Number(point.a.toFixed(1)));
        const queueB = history.map((point) => Number(point.b.toFixed(1)));

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = queueA;
        this.chart.data.datasets[1].data = queueB;
        this.chart.update();
    },
};

window.addEventListener('DOMContentLoaded', () => {
    window.queueChartUpdater.init();
});
