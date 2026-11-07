const { createApp } = Vue;

const cityCarColors = ['#38bdf8', '#fb7185', '#fbbf24', '#a78bfa', '#34d399'];
const cityLanes = [
    { id: 'east-top', axis: 'horizontal', direction: 1, row: 0, x: -24, y: 206, rotation: 0, route: [1, 2] },
    { id: 'west-top', axis: 'horizontal', direction: -1, row: 0, x: 1024, y: 174, rotation: 180, route: [2, 1] },
    { id: 'east-bottom', axis: 'horizontal', direction: 1, row: 1, x: -24, y: 466, rotation: 0, route: [3, 4] },
    { id: 'west-bottom', axis: 'horizontal', direction: -1, row: 1, x: 1024, y: 434, rotation: 180, route: [4, 3] },
    { id: 'south-left', axis: 'vertical', direction: 1, column: 0, x: 294, y: -24, rotation: 90, route: [1, 3] },
    { id: 'north-left', axis: 'vertical', direction: -1, column: 0, x: 326, y: 664, rotation: 270, route: [3, 1] },
    { id: 'south-right', axis: 'vertical', direction: 1, column: 1, x: 674, y: -24, rotation: 90, route: [2, 4] },
    { id: 'north-right', axis: 'vertical', direction: -1, column: 1, x: 706, y: 664, rotation: 270, route: [4, 2] },
];
const cityNodePositions = [
    { id: 1, x: 310, y: 190 },
    { id: 2, x: 690, y: 190 },
    { id: 3, x: 310, y: 450 },
    { id: 4, x: 690, y: 450 },
];

function createCityNodes() {
    return cityNodePositions.map((position, index) => ({
        ...position,
        axis: index % 2 === 0 ? 'horizontal' : 'vertical',
        stage: 'green',
        elapsed: 0,
        greenDuration: 8,
        wait: { horizontal: 0, vertical: 0 },
    }));
}

function createInitialVehicles() {
    let id = 1;
    return cityLanes.map((lane) => createBoundaryVehicle(lane, id++));
}

function createBoundaryVehicle(lane, id) {
    return {
        id,
        laneId: lane.id,
        axis: lane.axis,
        direction: lane.direction,
        row: lane.row,
        column: lane.column,
        x: lane.x,
        y: lane.y,
        rotation: lane.rotation,
        route: [...lane.route],
        routeIndex: 0,
        color: cityCarColors[id % cityCarColors.length],
    };
}

createApp({
    delimiters: ['[[', ']]'],
    data() {
        return {
            mode: 'fixed',
            activeRunMode: 'fixed',
            demandScale: 1,
            flowProfile: 'east-west-peak',
            running: false,
            intervalId: null,
            elapsed: 0,
            exitedVehicles: 0,
            maxQueue: 0,
            comparisonResults: { fixed: null, adaptive: null },
            nextVehicleId: cityLanes.length + 1,
            spawnElapsed: Object.fromEntries(cityLanes.map((lane) => [lane.id, 0])),
            nodes: createCityNodes(),
            vehicles: createInitialVehicles(),
            yellowDuration: 1.5,
            clearanceDuration: 1,
            maxWait: 14,
            vehicleSpeed: 54,
            vehicleGap: 32,
        };
    },
    computed: {
        totalQueued() {
            return this.vehicles.length;
        },
        modeDescription() {
            return this.mode === 'fixed'
                ? 'Plan convencional de referencia: mantiene tiempos iguales aunque cambie el tamaño de las filas.'
                : 'Control adaptativo: prioriza la cola mayor y estima el verde entre 5 y 12 s mediante bisección.';
        },
        fixedResult() {
            return this.comparisonResults.fixed;
        },
        adaptiveResult() {
            return this.comparisonResults.adaptive;
        },
        sameDuration() {
            if (!this.fixedResult || !this.adaptiveResult) return false;
            const longestRun = Math.max(this.fixedResult.elapsed, this.adaptiveResult.elapsed);
            return longestRun > 0
                && Math.abs(this.fixedResult.elapsed - this.adaptiveResult.elapsed) <= longestRun * 0.05;
        },
        queueReduction() {
            if (!this.sameDuration || this.fixedResult.maxQueue === 0) return null;
            return Math.round((this.fixedResult.maxQueue - this.adaptiveResult.maxQueue) / this.fixedResult.maxQueue * 100);
        },
        maxComparedQueue() {
            return Math.max(
                this.fixedResult ? this.fixedResult.maxQueue : 0,
                this.adaptiveResult ? this.adaptiveResult.maxQueue : 0,
                1,
            );
        },
    },
    methods: {
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        comparisonWidth(result) {
            return Math.max(4, result.maxQueue / this.maxComparedQueue * 100);
        },
        getLane(laneId) {
            return cityLanes.find((lane) => lane.id === laneId);
        },
        getNode(nodeId) {
            return this.nodes.find((node) => node.id === nodeId);
        },
        queueTotal(node, axis) {
            return this.vehicles.filter((vehicle) => (
                vehicle.axis === axis && vehicle.route[vehicle.routeIndex] === node.id
            )).length;
        },
        stoppedQueueTotal(node, axis) {
            return this.vehicles.filter((vehicle) => (
                vehicle.waiting && vehicle.axis === axis && vehicle.route[vehicle.routeIndex] === node.id
            )).length;
        },
        arrivalInterval(lane) {
            if (this.flowProfile === 'balanced') return 3.8 / this.demandScale;
            const peakAxis = this.flowProfile === 'east-west-peak' ? 'horizontal' : 'vertical';
            return (lane.axis === peakAxis ? 2.7 : 7.6) / this.demandScale;
        },
        lightClass(node, axis) {
            if (node.stage === 'clearance') return 'light-red';
            if (node.axis !== axis) return 'light-red';
            return node.stage === 'yellow' ? 'light-yellow' : 'light-green';
        },
        queuePosition(vehicle) {
            return vehicle.axis === 'horizontal' ? vehicle.x : vehicle.y;
        },
        nextStop(vehicle) {
            const nodeId = vehicle.route[vehicle.routeIndex];
            const node = nodeId === undefined ? null : this.getNode(nodeId);
            if (!node) return null;
            const coordinate = vehicle.axis === 'horizontal' ? node.x : node.y;
            return {
                node,
                coordinate: coordinate - vehicle.direction * 62,
            };
        },
        canEnterIntersection(vehicle, stop) {
            if (vehicle.direction * (this.queuePosition(vehicle) - stop.coordinate) > 0) {
                return true;
            }
            return stop.node.stage === 'green' && stop.node.axis === vehicle.axis;
        },
        advanceNode(node, dt) {
            node.elapsed += dt;
            const stageDuration = node.stage === 'green'
                ? node.greenDuration
                : node.stage === 'yellow' ? this.yellowDuration : this.clearanceDuration;
            if (node.elapsed < stageDuration) return;

            node.elapsed -= stageDuration;
            if (node.stage === 'green') {
                node.stage = 'yellow';
                return;
            }
            if (node.stage === 'yellow') {
                node.stage = 'clearance';
                return;
            }

            const horizontalWait = node.wait.horizontal;
            const verticalWait = node.wait.vertical;
            let nextAxis;
            if (this.mode === 'fixed') {
                nextAxis = node.axis === 'horizontal' ? 'vertical' : 'horizontal';
            } else if (horizontalWait >= this.maxWait || verticalWait >= this.maxWait) {
                nextAxis = horizontalWait >= verticalWait ? 'horizontal' : 'vertical';
            } else {
                const horizontalQueue = this.queueTotal(node, 'horizontal');
                const verticalQueue = this.queueTotal(node, 'vertical');
                nextAxis = horizontalQueue === verticalQueue
                    ? node.axis === 'horizontal' ? 'vertical' : 'horizontal'
                    : horizontalQueue > verticalQueue ? 'horizontal' : 'vertical';
            }
            this.beginGreen(node, nextAxis);
        },
        beginGreen(node, axis) {
            node.axis = axis;
            node.stage = 'green';
            node.elapsed = 0;
            node.greenDuration = this.mode === 'fixed' ? 8 : this.estimateGreenDuration(node, axis);
            node.wait[axis] = 0;
        },
        estimateGreenDuration(node, axis) {
            const queue = this.stoppedQueueTotal(node, axis);
            const peakAxis = this.flowProfile === 'east-west-peak' ? 'horizontal'
                : this.flowProfile === 'north-south-peak' ? 'vertical' : null;
            const interval = peakAxis === null
                ? 3.8 / this.demandScale
                : (axis === peakAxis ? 2.7 : 7.6) / this.demandScale;
            const arrivalRate = 2 / interval;
            const serviceRate = 2 * this.vehicleSpeed / (20 + this.vehicleGap);
            const netServiceRate = serviceRate - arrivalRate;
            if (netServiceRate <= 0) return 12;

            const remainingQueue = (duration) => queue - netServiceRate * duration;
            let lower = 5;
            let upper = 12;
            if (remainingQueue(lower) <= 0) return lower;
            if (remainingQueue(upper) >= 0) return upper;

            for (let iteration = 0; iteration < 20; iteration += 1) {
                const midpoint = (lower + upper) / 2;
                if (remainingQueue(midpoint) > 0) lower = midpoint;
                else upper = midpoint;
            }
            return (lower + upper) / 2;
        },
        advanceVehicle(vehicle, dt) {
            const coordinateKey = vehicle.axis === 'horizontal' ? 'x' : 'y';
            const start = vehicle[coordinateKey];
            let nextPosition = start + vehicle.direction * this.vehicleSpeed * dt;
            const stop = this.nextStop(vehicle);
            if (stop && !this.canEnterIntersection(vehicle, stop)) {
                nextPosition = vehicle.direction > 0
                    ? Math.min(nextPosition, stop.coordinate)
                    : Math.max(nextPosition, stop.coordinate);
            }

            const leader = this.vehicles
                .filter((other) => other.laneId === vehicle.laneId && other.id !== vehicle.id)
                .filter((other) => vehicle.direction * (other[coordinateKey] - start) > 0)
                .sort((first, second) => vehicle.direction * (first[coordinateKey] - second[coordinateKey]))[0];
            if (leader) {
                const safePosition = leader[coordinateKey] - vehicle.direction * this.vehicleGap;
                nextPosition = vehicle.direction > 0
                    ? Math.max(start, Math.min(nextPosition, safePosition))
                    : Math.min(start, Math.max(nextPosition, safePosition));
            }

            vehicle.waiting = Math.abs(nextPosition - start) < 0.001;
            vehicle[coordinateKey] = nextPosition;
            const nextNode = vehicle.route[vehicle.routeIndex];
            if (nextNode !== undefined) {
                const node = this.getNode(nextNode);
                const farEdge = (vehicle.axis === 'horizontal' ? node.x : node.y) + vehicle.direction * 62;
                if (vehicle.direction * (nextPosition - farEdge) >= 0) {
                    vehicle.routeIndex += 1;
                }
            }

            const exitLimit = vehicle.axis === 'horizontal' ? 1032 : 672;
            if (nextPosition < -32 || nextPosition > exitLimit) {
                this.exitedVehicles += 1;
                return false;
            }
            return true;
        },
        spawnVehicles(dt) {
            cityLanes.forEach((lane) => {
                this.spawnElapsed[lane.id] += dt;
                const interval = this.arrivalInterval(lane);
                if (this.spawnElapsed[lane.id] < interval) return;

                const atEntry = this.vehicles.filter((vehicle) => (
                    vehicle.laneId === lane.id
                    && lane.direction * (vehicle[vehicle.axis === 'horizontal' ? 'x' : 'y'] - lane[vehicle.axis === 'horizontal' ? 'x' : 'y']) <= this.vehicleGap
                ));
                if (atEntry.length === 0 && this.vehicles.length < 400) {
                    this.vehicles.push(createBoundaryVehicle(lane, this.nextVehicleId++));
                    this.spawnElapsed[lane.id] = 0;
                }
            });
        },
        updateWaitingTimes(dt) {
            this.nodes.forEach((node) => {
                ['horizontal', 'vertical'].forEach((axis) => {
                    if (node.stage === 'green' && node.axis === axis) {
                        node.wait[axis] = 0;
                    } else if (this.queueTotal(node, axis) > 0) {
                        node.wait[axis] += dt;
                    }
                });
            });
        },
        tick() {
            const dt = 0.1;
            this.nodes.forEach((node) => this.advanceNode(node, dt));
            const activeVehicles = this.vehicles.filter((vehicle) => this.advanceVehicle(vehicle, dt));
            this.vehicles = activeVehicles;
            this.elapsed += dt;
            this.spawnVehicles(dt);
            this.updateWaitingTimes(dt);
            this.nodes.forEach((node) => {
                this.maxQueue = Math.max(
                    this.maxQueue,
                    this.stoppedQueueTotal(node, 'horizontal'),
                    this.stoppedQueueTotal(node, 'vertical'),
                );
            });
        },
        startSimulation() {
            if (this.running) return;
            this.running = true;
            this.intervalId = window.setInterval(this.tick, 100);
        },
        pauseSimulation(saveResult = true) {
            if (saveResult) this.recordComparison(this.activeRunMode);
            this.running = false;
            if (this.intervalId !== null) {
                window.clearInterval(this.intervalId);
            }
            this.intervalId = null;
        },
        recordComparison(mode) {
            if (this.elapsed <= 0) return;
            this.comparisonResults[mode] = {
                maxQueue: this.maxQueue,
                exitedVehicles: this.exitedVehicles,
                elapsed: this.elapsed,
            };
        },
        resetSimulation(saveResult = true) {
            if (saveResult) this.recordComparison(this.activeRunMode);
            this.pauseSimulation(false);
            this.elapsed = 0;
            this.exitedVehicles = 0;
            this.maxQueue = 0;
            this.nextVehicleId = cityLanes.length + 1;
            this.spawnElapsed = Object.fromEntries(cityLanes.map((lane) => [lane.id, 0]));
            this.nodes = createCityNodes();
            this.vehicles = createInitialVehicles();
            this.nodes.forEach((node) => {
                node.greenDuration = this.mode === 'fixed' ? 8 : this.estimateGreenDuration(node, node.axis);
            });
        },
        changeMode() {
            this.recordComparison(this.activeRunMode);
            this.activeRunMode = this.mode;
            this.resetSimulation(false);
        },
        changeScenario() {
            this.comparisonResults = { fixed: null, adaptive: null };
            this.resetSimulation(false);
        },
    },
    beforeUnmount() {
        this.pauseSimulation(false);
    },
}).mount('#city-app');
