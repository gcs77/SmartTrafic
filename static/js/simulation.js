document.addEventListener('DOMContentLoaded', () => {
    const signalStatus = document.getElementById('signal-status');
    const elapsedTimeEl = document.getElementById('elapsed-time');
    const arrivalsTotalEl = document.getElementById('arrivals-total');
    const departuresTotalEl = document.getElementById('departures-total');
    const waitingTotalEl = document.getElementById('waiting-total');
    const maxAEl = document.getElementById('max-a');
    const maxBEl = document.getElementById('max-b');
    const queueAEl = document.getElementById('queue-a');
    const queueBEl = document.getElementById('queue-b');
    const lightAEl = document.getElementById('light-a');
    const lightBEl = document.getElementById('light-b');
    const fixedTotalEl = document.getElementById('fixed-total');
    const adaptiveTotalEl = document.getElementById('adaptive-total');
    const reductionEl = document.getElementById('reduction-percent');
    const modeSelect = document.getElementById('mode-select');

    const configInputs = {
        arrivalA: document.getElementById('arrival-a'),
        arrivalB: document.getElementById('arrival-b'),
        serviceA: document.getElementById('service-a'),
        serviceB: document.getElementById('service-b'),
        greenTime: document.getElementById('green-time'),
        yellowTime: document.getElementById('yellow-time'),
        initialA: document.getElementById('initial-a'),
        initialB: document.getElementById('initial-b'),
        totalTime: document.getElementById('total-time'),
    };

    const state = {
        running: false,
        intervalId: null,
        elapsed: 0,
        phaseIndex: 0,
        queues: { A: 6, B: 4 },
        stats: {
            arrivals: 0,
            departures: 0,
            maxA: 6,
            maxB: 4,
            history: [],
        },
        lastTick: 0,
    };

    const phases = [
        { name: 'A_GREEN', duration: Number(configInputs.greenTime.value) },
        { name: 'YELLOW', duration: Number(configInputs.yellowTime.value) },
        { name: 'B_GREEN', duration: Number(configInputs.greenTime.value) },
        { name: 'YELLOW', duration: Number(configInputs.yellowTime.value) },
    ];

    function getPhase() {
        return phases[state.phaseIndex % phases.length];
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getCurrentConfig() {
        return {
            arrivalA: Number(configInputs.arrivalA.value) || 0,
            arrivalB: Number(configInputs.arrivalB.value) || 0,
            serviceA: Number(configInputs.serviceA.value) || 0,
            serviceB: Number(configInputs.serviceB.value) || 0,
            greenTime: Number(configInputs.greenTime.value) || 1,
            yellowTime: Number(configInputs.yellowTime.value) || 0,
            totalTime: Number(configInputs.totalTime.value) || 60,
        };
    }

    function syncPhaseDurations() {
        phases[0].duration = Number(configInputs.greenTime.value) || 1;
        phases[2].duration = Number(configInputs.greenTime.value) || 1;
        phases[1].duration = Number(configInputs.yellowTime.value) || 0;
        phases[3].duration = Number(configInputs.yellowTime.value) || 0;
    }

    function setSignalLights(phaseName) {
        const aGreen = phaseName === 'A_GREEN';
        const bGreen = phaseName === 'B_GREEN';
        lightAEl.style.background = aGreen ? '#22c55e' : '#475569';
        lightBEl.style.background = bGreen ? '#22c55e' : '#475569';
        lightAEl.style.boxShadow = aGreen ? '0 0 18px rgba(34,197,94,0.9)' : '0 0 10px rgba(255,255,255,0.1)';
        lightBEl.style.boxShadow = bGreen ? '0 0 18px rgba(34,197,94,0.9)' : '0 0 10px rgba(255,255,255,0.1)';
        signalStatus.textContent = `Semáforo: ${aGreen ? 'A verde' : bGreen ? 'B verde' : 'Amarillo'}`;
    }

    function renderStats() {
        elapsedTimeEl.textContent = `${state.elapsed.toFixed(1)} s`;
        arrivalsTotalEl.textContent = Math.round(state.stats.arrivals);
        departuresTotalEl.textContent = Math.round(state.stats.departures);
        waitingTotalEl.textContent = Math.round(state.queues.A + state.queues.B);
        maxAEl.textContent = Math.round(state.stats.maxA);
        maxBEl.textContent = Math.round(state.stats.maxB);
        queueAEl.textContent = state.queues.A.toFixed(0);
        queueBEl.textContent = state.queues.B.toFixed(0);
    }

    function updateComparisonSummary() {
        const summary = window.scenarioSummary || { scenarios: [], best_mode: 'fixed', wins: { fixed: 0, adaptive: 0 }, average_difference_percent: 0 };
        const current = summary.scenarios[0] || { fixed_total_queue: 0, adaptive_total_queue: 0, difference_percent: 0 };
        const fixed = Number(current.fixed_total_queue || 0);
        const adaptive = Number(current.adaptive_total_queue || 0);
        const reduction = fixed === 0 ? 0 : ((fixed - adaptive) / fixed) * 100;
        fixedTotalEl.textContent = fixed.toFixed(1);
        adaptiveTotalEl.textContent = adaptive.toFixed(1);
        reductionEl.textContent = `${reduction.toFixed(1)}%`;

        const scenarioList = document.getElementById('scenario-summary');
        const executiveNote = document.getElementById('executive-note');

        if (summary.scenarios.length > 0) {
            scenarioList.innerHTML = summary.scenarios
                .map((scenario, index) => {
                    const winner = scenario.winner || 'fixed';
                    return `
                        <div class="scenario-item">
                            <strong>Escenario ${index + 1}</strong>
                            <span>Fijo: ${Number(scenario.fixed_total_queue).toFixed(1)}</span>
                            <span class="winner">${winner === 'adaptive' ? 'Adaptativo' : 'Fijo'} gana</span>
                        </div>
                    `;
                })
                .join('');
            const overallLabel = document.createElement('div');
            overallLabel.className = 'scenario-item';
            overallLabel.innerHTML = `<strong>Modo global</strong><span>${summary.best_mode === 'adaptive' ? 'Adaptativo' : 'Fijo'}</span><span class="winner">ganador</span>`;
            scenarioList.appendChild(overallLabel);

            const modeLabel = summary.best_mode === 'adaptive' ? 'Adaptativo' : 'Fijo';
            const winText = `${modeLabel} ganó ${summary.wins[summary.best_mode] || 0} de ${summary.total_scenarios || summary.scenarios.length} escenarios.`;
            const averageText = `Reducción promedio: ${Number(summary.average_difference_percent || 0).toFixed(1)}%.`;
            executiveNote.textContent = `${winText} ${averageText}`;
        } else {
            scenarioList.innerHTML = '';
            executiveNote.textContent = 'No hay escenarios disponibles para resumir.';
        }
    }

    function stepSimulation(dt) {
        const config = getCurrentConfig();
        const phase = getPhase();
        const aGreen = phase.name === 'A_GREEN';
        const bGreen = phase.name === 'B_GREEN';

        const arrivalsA = config.arrivalA * dt;
        const arrivalsB = config.arrivalB * dt;
        const departuresA = aGreen ? Math.min(state.queues.A, config.serviceA * dt) : 0;
        const departuresB = bGreen ? Math.min(state.queues.B, config.serviceB * dt) : 0;

        state.queues.A = clamp(state.queues.A + arrivalsA - departuresA, 0, 9999);
        state.queues.B = clamp(state.queues.B + arrivalsB - departuresB, 0, 9999);

        state.stats.arrivals += arrivalsA + arrivalsB;
        state.stats.departures += departuresA + departuresB;
        state.stats.maxA = Math.max(state.stats.maxA, state.queues.A);
        state.stats.maxB = Math.max(state.stats.maxB, state.queues.B);
        state.stats.history.push({ time: state.elapsed, a: state.queues.A, b: state.queues.B });

        state.elapsed += dt;
        if (state.elapsed >= config.totalTime) {
            stopSimulation();
            return;
        }

        if (state.elapsed >= phases[state.phaseIndex].duration) {
            state.phaseIndex = (state.phaseIndex + 1) % phases.length;
        }

        setSignalLights(getPhase().name);
        renderStats();
        updateComparisonSummary();
        window.queueChartUpdater && window.queueChartUpdater.updateChart(state.stats.history);
    }

    function tick() {
        syncPhaseDurations();
        stepSimulation(0.5);
    }

    function startSimulation() {
        syncPhaseDurations();
        if (state.running) return;
        state.running = true;
        state.lastTick = performance.now();
        state.intervalId = setInterval(tick, 500);
        setSignalLights(getPhase().name);
    }

    function pauseSimulation() {
        state.running = false;
        if (state.intervalId) clearInterval(state.intervalId);
        state.intervalId = null;
    }

    function resumeSimulation() {
        if (!state.running) {
            startSimulation();
        }
    }

    function resetSimulation() {
        pauseSimulation();
        state.elapsed = 0;
        state.phaseIndex = 0;
        state.queues.A = Number(configInputs.initialA.value) || 0;
        state.queues.B = Number(configInputs.initialB.value) || 0;
        state.stats.arrivals = 0;
        state.stats.departures = 0;
        state.stats.maxA = state.queues.A;
        state.stats.maxB = state.queues.B;
        state.stats.history = [{ time: 0, a: state.queues.A, b: state.queues.B }];
        setSignalLights('A_GREEN');
        renderStats();
        updateComparisonSummary();
        window.queueChartUpdater && window.queueChartUpdater.updateChart(state.stats.history);
    }

    document.getElementById('start-btn').addEventListener('click', startSimulation);
    document.getElementById('pause-btn').addEventListener('click', pauseSimulation);
    document.getElementById('resume-btn').addEventListener('click', resumeSimulation);
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
    modeSelect.addEventListener('change', () => {
        signalStatus.textContent = `Semáforo: modo ${modeSelect.value}`;
    });

    function stopSimulation() {
        pauseSimulation();
        state.running = false;
        signalStatus.textContent = 'Semáforo: simulado';
    }

    resetSimulation();
});
