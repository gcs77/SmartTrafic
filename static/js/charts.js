window.queueChartUpdater = {
    chart: null,
    init: function() {
        const ctx = document.getElementById('queueChart');
        if (!ctx || this.chart) return;
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [0],
                datasets: [
                    {
                        label: 'Dirección A',
                        data: [0],
                        borderColor: '#34d399',
                        backgroundColor: 'rgba(52,211,153,0.08)',
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.35,
                    },
                    {
                        label: 'Dirección B',
                        data: [0],
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56,189,248,0.07)',
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.35,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 260 },
                scales: {
                    y: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: { color: 'rgba(148,163,184,0.12)' },
                        ticks: { color: '#94a3b8', padding: 8 },
                        title: { display: true, text: 'Vehículos en fila', color: '#cbd5e1' },
                    },
                    x: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: { color: '#94a3b8', maxTicksLimit: 9 },
                        title: { display: true, text: 'Tiempo simulado (s)', color: '#cbd5e1' },
                    },
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: { color: '#e2e8f0', usePointStyle: true, pointStyle: 'circle', boxWidth: 8 },
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(148,163,184,0.24)',
                        borderWidth: 1,
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        padding: 10,
                        displayColors: true,
                    },
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
