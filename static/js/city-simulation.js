const { createApp } = Vue;

const cityDirections = {
    east: 'horizontal',
    west: 'horizontal',
    north: 'vertical',
    south: 'vertical',
};

function createCityNodes() {
    const positions = [
        { id: 1, x: 310, y: 190 },
        { id: 2, x: 690, y: 190 },
        { id: 3, x: 310, y: 450 },
        { id: 4, x: 690, y: 450 },
    ];

    return positions.map((position, index) => ({
        ...position,
        axis: index % 2 === 0 ? 'horizontal' : 'vertical',
        stage: 'green',
        elapsed: 0,
        greenDuration: 8,
        wait: { horizontal: 0, vertical: 0 },
        queues: {
            east: 3 + index,
            west: 2 + (index % 2),
            north: 2 + ((index + 1) % 3),
            south: 3 + ((index + 2) % 3),
        },
        rates: {
            east: 0.32 + index * 0.025,
            west: 0.24 + (index % 2) * 0.06,
            north: 0.28 + (index % 3) * 0.035,
            south: 0.3 + ((index + 1) % 3) * 0.03,
        },
    }));
}

createApp({
    delimiters: ['[[', ']]'],
    data() {
        return {
            mode: 'adaptive',
            demandScale: 1,
            running: false,
            intervalId: null,
            elapsed: 0,
            departures: 0,
            nodes: createCityNodes(),
            yellowDuration: 1.5,
            maxWait: 14,
            carColors: ['#38bdf8', '#fb7185', '#fbbf24', '#a78bfa', '#34d399'],
        };
    },
    computed: {
        totalQueued() {
            return this.nodes.reduce(
                (total, node) => total + Object.values(node.queues).reduce((sum, queue) => sum + queue, 0),
                0,
            );
        },
    },
    methods: {
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        queueTotal(node, axis) {
            return axis === 'horizontal'
                ? node.queues.east + node.queues.west
                : node.queues.north + node.queues.south;
        },
        lightClass(node, axis) {
            if (node.axis !== axis) return 'light-red';
            return node.stage === 'yellow' ? 'light-yellow' : 'light-green';
        },
        visibleCars(node) {
            const approaches = [
                { direction: 'east', x: -68, y: -27, dx: -23, dy: 0, rotation: 0 },
                { direction: 'west', x: 48, y: 15, dx: 23, dy: 0, rotation: 180 },
                { direction: 'north', x: 13, y: -65, dx: 0, dy: -23, rotation: 90 },
                { direction: 'south', x: -27, y: 48, dx: 0, dy: 23, rotation: 270 },
            ];
            const cars = [];

            approaches.forEach((approach) => {
                const count = Math.min(2, Math.ceil(node.queues[approach.direction]));
                for (let index = 0; index < count; index += 1) {
                    cars.push({
                        key: `${node.id}-${approach.direction}-${index}`,
                        x: node.x + approach.x + approach.dx * index,
                        y: node.y + approach.y + approach.dy * index,
                        rotation: approach.rotation,
                        color: this.carColors[(node.id + index + approach.direction.length) % this.carColors.length],
                    });
                }
            });

            return cars;
        },
        crossingCars(node) {
            if (node.stage !== 'green') return [];
            const pressure = this.queueTotal(node, node.axis);
            const count = Math.min(2, Math.ceil(pressure / 6));
            const directions = node.axis === 'horizontal' ? ['east', 'west'] : ['south', 'north'];
            return Array.from({ length: count }, (_, index) => ({
                key: `${node.id}-${node.axis}-${index}`,
                direction: directions[index],
                delay: index * -1.1,
                color: this.carColors[(node.id + index) % this.carColors.length],
            }));
        },
        chooseAdaptiveAxis(node) {
            const horizontalWait = node.wait.horizontal;
            const verticalWait = node.wait.vertical;
            if (horizontalWait >= this.maxWait || verticalWait >= this.maxWait) {
                return horizontalWait >= verticalWait ? 'horizontal' : 'vertical';
            }

            const horizontalPressure = this.queueTotal(node, 'horizontal');
            const verticalPressure = this.queueTotal(node, 'vertical');
            if (horizontalPressure === verticalPressure) {
                return node.axis === 'horizontal' ? 'vertical' : 'horizontal';
            }
            return horizontalPressure > verticalPressure ? 'horizontal' : 'vertical';
        },
        beginGreen(node, axis) {
            node.axis = axis;
            node.stage = 'green';
            node.elapsed = 0;
            node.greenDuration = this.mode === 'fixed'
                ? 8
                : this.clamp(5 + this.queueTotal(node, axis) / 2.5, 5, 12);
            node.wait[axis] = 0;
        },
        advanceNode(node, dt) {
            Object.entries(node.queues).forEach(([direction, queue]) => {
                const arrivals = node.rates[direction] * this.demandScale * dt;
                const isGreen = node.stage === 'green' && node.axis === cityDirections[direction];
                const served = isGreen ? Math.min(queue + arrivals, 1.35 * dt) : 0;
                node.queues[direction] = this.clamp(queue + arrivals - served, 0, 999);
                this.departures += served;
            });

            node.elapsed += dt;
            const stageDuration = node.stage === 'green' ? node.greenDuration : this.yellowDuration;
            if (node.elapsed >= stageDuration) {
                node.elapsed -= stageDuration;
                if (node.stage === 'green') {
                    node.stage = 'yellow';
                } else {
                    const nextAxis = this.mode === 'adaptive'
                        ? this.chooseAdaptiveAxis(node)
                        : node.axis === 'horizontal' ? 'vertical' : 'horizontal';
                    this.beginGreen(node, nextAxis);
                }
            }

            ['horizontal', 'vertical'].forEach((axis) => {
                if (node.stage === 'green' && node.axis === axis) {
                    node.wait[axis] = 0;
                } else {
                    node.wait[axis] += dt;
                }
            });
        },
        tick() {
            const dt = 0.5;
            this.nodes.forEach((node) => this.advanceNode(node, dt));
            this.elapsed += dt;
        },
        startSimulation() {
            if (this.running) return;
            this.running = true;
            this.intervalId = window.setInterval(this.tick, 500);
        },
        pauseSimulation() {
            this.running = false;
            if (this.intervalId !== null) {
                window.clearInterval(this.intervalId);
            }
            this.intervalId = null;
        },
        resetSimulation() {
            this.pauseSimulation();
            this.elapsed = 0;
            this.departures = 0;
            this.nodes = createCityNodes();
            this.nodes.forEach((node) => {
                if (this.mode === 'adaptive') {
                    node.greenDuration = this.clamp(5 + this.queueTotal(node, node.axis) / 2.5, 5, 12);
                }
            });
        },
        changeMode() {
            this.nodes.forEach((node) => {
                if (node.stage === 'green') {
                    node.greenDuration = this.mode === 'fixed'
                        ? 8
                        : this.clamp(5 + this.queueTotal(node, node.axis) / 2.5, 5, 12);
                }
            });
        },
    },
    beforeUnmount() {
        this.pauseSimulation();
    },
}).mount('#city-app');
