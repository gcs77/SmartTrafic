const { createApp } = Vue;

const AUTONOMOUS_CONFIG = Object.freeze({
    arrivalA: 1.2,
    arrivalB: 1.0,
    serviceA: 2.0,
    serviceB: 1.8,
    greenTime: 10,
    yellowTime: 2,
    initialA: 6,
    initialB: 4,
    totalTime: 60,
});

createApp({
    delimiters: ['[[', ']]'],
    data() {
        return {
            config: {
                arrivalA: 1.2,
                arrivalB: 1.0,
                serviceA: 2.0,
                serviceB: 1.8,
                greenTime: 10,
                yellowTime: 2,
                initialA: 6,
                initialB: 4,
                totalTime: 60,
            },
            mode: 'fixed',
            running: false,
            intervalId: null,
            elapsed: 0,
            lastAnalysisSecond: -1,
            analysisRequestId: 0,
            phaseIndex: 0,
            phaseElapsed: 0,
            signalPhase: 'A_GREEN',
            signalStatus: 'Semáforo: A verde',
            queueVehicles: { A: [], B: [] },
            nextVehicleId: 1,
            phases: [
                { name: 'A_GREEN', duration: 10 },
                { name: 'A_YELLOW', duration: 2 },
                { name: 'B_GREEN', duration: 10 },
                { name: 'B_YELLOW', duration: 2 },
            ],
            queues: { A: 6, B: 4 },
            stats: {
                arrivals: 0,
                departures: 0,
                maxA: 6,
                maxB: 4,
                history: [],
            },
            scenarioSummary: window.scenarioSummary || {
                scenarios: [],
                best_mode: 'fixed',
                wins: { fixed: 0, adaptive: 0 },
                average_difference_percent: 0,
            },
            analysis: {
                targetQueue: 4,
                jacobiA: 0,
                jacobiB: 0,
                greenA: 0,
                greenB: 0,
                falseA: 0,
                falseB: 0,
                forecastA: 0,
                forecastB: 0,
                simpson: 0,
                romberg: 0,
                error: '',
            },
            carColors: ['#38bdf8', '#fb7185', '#fbbf24', '#a78bfa', '#34d399'],
        };
    },
    computed: {
        signalStateA() {
            if (this.signalPhase === 'A_GREEN') return 'green';
            if (this.signalPhase === 'A_YELLOW') return 'yellow';
            return 'red';
        },
        signalStateB() {
            if (this.signalPhase === 'B_GREEN') return 'green';
            if (this.signalPhase === 'B_YELLOW') return 'yellow';
            return 'red';
        },
        visibleQueueA() {
            const visibleVehicles = this.queueVehicles.A.slice(-6);
            const count = visibleVehicles.length;
            return visibleVehicles.map((vehicle, index) => ({
                ...vehicle,
                x: 260 - (count - index - 1) * 48,
                y: 242,
            }));
        },
        visibleQueueB() {
            const visibleVehicles = this.queueVehicles.B.slice(-4);
            const count = visibleVehicles.length;
            return visibleVehicles.map((vehicle, index) => ({
                ...vehicle,
                x: 308,
                y: 95 - (count - index - 1) * 44,
            }));
        },
        movingCarsA() {
            const count = this.running && this.signalStateA === 'green' ? Math.min(3, Math.ceil(this.queues.A)) : 0;
            return Array.from({ length: count }, (_, index) => index);
        },
        movingCarsB() {
            const count = this.running && this.signalStateB === 'green' ? Math.min(3, Math.ceil(this.queues.B)) : 0;
            return Array.from({ length: count }, (_, index) => index);
        },
        activeConfig() {
            return this.mode === 'adaptive'
                ? {
                    ...AUTONOMOUS_CONFIG,
                    initialA: Number(this.config.initialA) || 0,
                    initialB: Number(this.config.initialB) || 0,
                }
                : this.config;
        },
        currentScenario() {
            const scenario = this.scenarioSummary.scenarios[0] || {};
            const fixed = Number(scenario.fixed_total_queue || 0);
            const adaptive = Number(scenario.adaptive_total_queue || 0);

            return {
                fixed,
                adaptive,
                reduction: fixed === 0 ? 0 : ((fixed - adaptive) / fixed) * 100,
            };
        },
        executiveNote() {
            const summary = this.scenarioSummary;
            if (!summary.scenarios.length) {
                return 'No hay escenarios disponibles para resumir.';
            }

            const bestMode = summary.best_mode === 'adaptive' ? 'Adaptativo' : 'Fijo';
            const wins = summary.wins[summary.best_mode] || 0;
            const total = summary.total_scenarios || summary.scenarios.length;
            const average = Number(summary.average_difference_percent || 0).toFixed(1);
            return `${bestMode} ganó ${wins} de ${total} escenarios. Reducción promedio: ${average}%.`;
        },
    },
    mounted() {
        window.queueChartUpdater.init();
        this.resetSimulation();
    },
    beforeUnmount() {
        this.pauseSimulation();
    },
    methods: {
        getPhase() {
            return this.phases[this.phaseIndex % this.phases.length];
        },
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        syncQueueVehicles(direction, queueSize) {
            const vehicles = this.queueVehicles[direction];
            const targetCount = Math.min(100, Math.ceil(queueSize));
            while (vehicles.length < targetCount) {
                const colorOffset = direction === 'A' ? 0 : 2;
                vehicles.unshift({
                    id: this.nextVehicleId++,
                    color: this.carColors[(this.nextVehicleId + colorOffset - 2) % this.carColors.length],
                });
            }
            if (vehicles.length > targetCount) {
                vehicles.splice(targetCount);
            }
        },
        getCurrentConfig() {
            const config = this.activeConfig;
            return {
                arrivalA: Number(config.arrivalA) || 0,
                arrivalB: Number(config.arrivalB) || 0,
                serviceA: Number(config.serviceA) || 0,
                serviceB: Number(config.serviceB) || 0,
                greenTime: Number(config.greenTime) || 1,
                yellowTime: Number(config.yellowTime) || 0,
                initialA: Number(config.initialA) || 0,
                initialB: Number(config.initialB) || 0,
                totalTime: Number(config.totalTime) || 60,
            };
        },
        syncPhaseDurations() {
            const config = this.getCurrentConfig();
            const greenTime = config.greenTime;
            const yellowTime = config.yellowTime;
            this.phases[0].duration = this.mode === 'adaptive' ? Math.max(1, this.analysis.greenA || greenTime) : greenTime;
            this.phases[2].duration = this.mode === 'adaptive' ? Math.max(1, this.analysis.greenB || greenTime) : greenTime;
            this.phases[1].duration = yellowTime;
            this.phases[3].duration = yellowTime;
        },
        setSignal(phaseName) {
            this.signalPhase = phaseName;
            const aGreen = phaseName === 'A_GREEN';
            const bGreen = phaseName === 'B_GREEN';
            const aYellow = phaseName === 'A_YELLOW';
            const bYellow = phaseName === 'B_YELLOW';
            this.signalStatus = `Semáforo: ${aGreen ? 'A verde · B rojo' : bGreen ? 'B verde · A rojo' : aYellow ? 'A amarillo · B rojo' : bYellow ? 'B amarillo · A rojo' : 'todo rojo'}`;
        },
        signalLabel(state) {
            return state === 'green' ? 'VERDE · avanzan' : state === 'yellow' ? 'AMARILLO · precaución' : 'ROJO · detenerse';
        },
        stepSimulation(dt) {
            const config = this.getCurrentConfig();
            const phase = this.getPhase();
            const aGreen = phase.name === 'A_GREEN';
            const bGreen = phase.name === 'B_GREEN';

            const arrivalsA = config.arrivalA * dt;
            const arrivalsB = config.arrivalB * dt;
            const departuresA = aGreen ? Math.min(this.queues.A, config.serviceA * dt) : 0;
            const departuresB = bGreen ? Math.min(this.queues.B, config.serviceB * dt) : 0;

            this.queues.A = this.clamp(this.queues.A + arrivalsA - departuresA, 0, 9999);
            this.queues.B = this.clamp(this.queues.B + arrivalsB - departuresB, 0, 9999);
            this.syncQueueVehicles('A', this.queues.A);
            this.syncQueueVehicles('B', this.queues.B);
            this.stats.arrivals += arrivalsA + arrivalsB;
            this.stats.departures += departuresA + departuresB;
            this.stats.maxA = Math.max(this.stats.maxA, this.queues.A);
            this.stats.maxB = Math.max(this.stats.maxB, this.queues.B);

            this.elapsed += dt;
            this.stats.history.push({ time: this.elapsed, a: this.queues.A, b: this.queues.B });
            this.phaseElapsed += dt;
            const elapsedSecond = Math.floor(this.elapsed);
            if (elapsedSecond > this.lastAnalysisSecond) {
                this.lastAnalysisSecond = elapsedSecond;
                this.refreshAnalysis();
            }
            if (this.elapsed >= config.totalTime) {
                this.stopSimulation();
                return;
            }

            while (this.phaseElapsed >= this.phases[this.phaseIndex].duration) {
                this.phaseElapsed -= this.phases[this.phaseIndex].duration;
                this.phaseIndex = (this.phaseIndex + 1) % this.phases.length;
                this.syncPhaseDurations();
            }

            this.setSignal(this.getPhase().name);
            window.queueChartUpdater.updateChart(this.stats.history);
        },
        tick() {
            this.stepSimulation(0.5);
        },
        startSimulation() {
            this.syncPhaseDurations();
            if (this.running) return;
            this.running = true;
            this.refreshAnalysis();
            this.intervalId = window.setInterval(this.tick, 500);
            this.setSignal(this.getPhase().name);
        },
        pauseSimulation() {
            this.running = false;
            if (this.intervalId !== null) {
                window.clearInterval(this.intervalId);
            }
            this.intervalId = null;
        },
        resumeSimulation() {
            if (!this.running) {
                this.startSimulation();
            }
        },
        resetSimulation() {
            this.pauseSimulation();
            const config = this.getCurrentConfig();
            this.elapsed = 0;
            this.phaseIndex = 0;
            this.phaseElapsed = 0;
            this.queues.A = config.initialA;
            this.queues.B = config.initialB;
            this.queueVehicles.A = [];
            this.queueVehicles.B = [];
            this.nextVehicleId = 1;
            this.syncQueueVehicles('A', this.queues.A);
            this.syncQueueVehicles('B', this.queues.B);
            this.stats.arrivals = 0;
            this.stats.departures = 0;
            this.stats.maxA = this.queues.A;
            this.stats.maxB = this.queues.B;
            this.stats.history = [{ time: 0, a: this.queues.A, b: this.queues.B }];
            this.lastAnalysisSecond = -1;
            this.setSignal('A_GREEN');
            window.queueChartUpdater.updateChart(this.stats.history);
            this.refreshAnalysis();
        },
        stopSimulation() {
            this.pauseSimulation();
            this.signalStatus = 'Semáforo: simulado';
        },
        changeMode() {
            this.analysis.greenA = 0;
            this.analysis.greenB = 0;
            this.resetSimulation();
            this.signalStatus = `Semáforo: modo ${this.mode}`;
        },
        async refreshAnalysis() {
            const requestId = ++this.analysisRequestId;
            const config = this.getCurrentConfig();
            this.analysis.error = '';
            try {
                const response = await fetch('/api/traffic-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        queues: this.queues,
                        rates: {
                            arrivalA: config.arrivalA,
                            arrivalB: config.arrivalB,
                            serviceA: config.serviceA,
                            serviceB: config.serviceB,
                        },
                        history: this.stats.history.slice(-33),
                    }),
                });
                const result = await response.json();
                if (requestId !== this.analysisRequestId) return;
                if (!response.ok) {
                    throw new Error(result.error || `HTTP ${response.status}`);
                }
                this.analysis = { ...result, error: '' };
                if (!this.running && this.mode === 'adaptive') {
                    this.syncPhaseDurations();
                }
            } catch (error) {
                if (requestId === this.analysisRequestId) {
                    this.analysis.error = error.message;
                }
            }
        },
    },
}).mount('#app');
