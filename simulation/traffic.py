"""Traffic model definitions for the Smart Traffic simulation."""

from __future__ import annotations

from dataclasses import dataclass

from simulation.signal_strategy import AdaptiveSignalStrategy, FixedTimeStrategy


class TrafficDirection:
    """Represents a traffic direction, queue, and service capacity."""

    def __init__(self, name: str, arrival_rate: float, service_rate: float, initial_queue: int = 0):
        self.name = name
        self.arrival_rate = float(arrival_rate)
        self.service_rate = float(service_rate)
        self.initial_queue = max(0, int(initial_queue))
        self.queue = float(self.initial_queue)

    def next_queue(self, green_light: bool, dt: float) -> float:
        """Computes the queue length after a time step."""
        if dt <= 0:
            return self.queue
        if green_light:
            return max(0.0, self.queue + self.arrival_rate * dt - self.service_rate * dt)
        return max(0.0, self.queue + self.arrival_rate * dt)

    def validate(self) -> None:
        if self.arrival_rate < 0 or self.service_rate < 0:
            raise ValueError("Arrival and service rates must be non-negative.")


@dataclass
class SimulationConfig:
    arrival_a: float = 1.2
    arrival_b: float = 1.0
    service_a: float = 2.0
    service_b: float = 1.8
    green_time: float = 10.0
    yellow_time: float = 2.0
    initial_queue_a: int = 6
    initial_queue_b: int = 4
    total_time: float = 60.0


class IntersectionModel:
    """Defines a two-direction intersection with a simplified queue model."""

    def __init__(self, direction_a: TrafficDirection, direction_b: TrafficDirection):
        self.direction_a = direction_a
        self.direction_b = direction_b

    def queue_total(self) -> float:
        return self.direction_a.queue + self.direction_b.queue

    def update(self, direction_a_green: bool, direction_b_green: bool, dt: float) -> None:
        self.direction_a.validate()
        self.direction_b.validate()

        if direction_a_green and direction_b_green:
            raise ValueError("The two directions cannot have green light at the same time.")

        self.direction_a.queue = self.direction_a.next_queue(direction_a_green, dt)
        self.direction_b.queue = self.direction_b.next_queue(direction_b_green, dt)

    def signal_is_safe(self, direction_a_green: bool, direction_b_green: bool) -> bool:
        return not (direction_a_green and direction_b_green)


class BasicTrafficSimulation:
    """Simple simulator that advances a fixed-time traffic signal."""

    def __init__(self, config: SimulationConfig | None = None):
        config = config or SimulationConfig()
        self.config = config
        self.mode = "fixed"
        self.elapsed_time = 0.0
        self.direction_a = TrafficDirection(
            "A",
            arrival_rate=config.arrival_a,
            service_rate=config.service_a,
            initial_queue=config.initial_queue_a,
        )
        self.direction_b = TrafficDirection(
            "B",
            arrival_rate=config.arrival_b,
            service_rate=config.service_b,
            initial_queue=config.initial_queue_b,
        )
        self.model = IntersectionModel(self.direction_a, self.direction_b)
        self.phase_index = 0
        self.phases = ["A_GREEN", "YELLOW", "B_GREEN", "YELLOW"]
        self.strategy = FixedTimeStrategy(green_time=config.green_time, yellow_time=config.yellow_time)
        self.adaptive_strategy = AdaptiveSignalStrategy(base_green_time=config.green_time, target_queue=8.0)

    def set_mode(self, mode: str) -> None:
        if mode not in {"fixed", "adaptive"}:
            raise ValueError("Mode must be 'fixed' or 'adaptive'.")
        self.mode = mode

    def current_phase(self) -> str:
        return self.phases[self.phase_index % len(self.phases)]

    def phase_duration(self) -> float:
        phase = self.current_phase()
        if self.mode == "adaptive":
            if phase == "A_GREEN":
                return self.adaptive_strategy.compute_green_time(self.direction_a.queue, self.direction_b.queue)
            if phase == "B_GREEN":
                return self.adaptive_strategy.compute_green_time(self.direction_b.queue, self.direction_a.queue)
            return self.config.yellow_time

        if phase == "A_GREEN":
            return self.config.green_time
        if phase == "B_GREEN":
            return self.config.green_time
        return self.config.yellow_time

    def advance(self, dt: float) -> None:
        if dt <= 0:
            return

        phase = self.current_phase()
        a_green = phase == "A_GREEN"
        b_green = phase == "B_GREEN"
        self.model.update(a_green, b_green, dt)
        self.elapsed_time += dt

        if self.elapsed_time >= self.phase_duration():
            self.phase_index = (self.phase_index + 1) % len(self.phases)
            self.elapsed_time = 0.0

    def snapshot(self):
        return {
            "elapsed_time": round(self.elapsed_time, 2),
            "phase": self.current_phase(),
            "queue_a": round(self.direction_a.queue, 2),
            "queue_b": round(self.direction_b.queue, 2),
            "total_queue": round(self.model.queue_total(), 2),
            "mode": self.mode,
        }


def compare_signal_modes(config: SimulationConfig | None = None):
    """Run both configurations and compare the aggregate traffic outcome."""
    config = config or SimulationConfig()

    fixed = BasicTrafficSimulation(config)
    adaptive = BasicTrafficSimulation(config)
    adaptive.set_mode("adaptive")

    step = 0.5
    steps = int(max(1, config.total_time / step))

    for _ in range(steps):
        fixed.advance(step)
        adaptive.advance(step)

    fixed_summary = {
        "total_queue": fixed.model.queue_total(),
        "queue_a": fixed.direction_a.queue,
        "queue_b": fixed.direction_b.queue,
        "elapsed_time": fixed.elapsed_time,
        "phase": fixed.current_phase(),
    }
    adaptive_summary = {
        "total_queue": adaptive.model.queue_total(),
        "queue_a": adaptive.direction_a.queue,
        "queue_b": adaptive.direction_b.queue,
        "elapsed_time": adaptive.elapsed_time,
        "phase": adaptive.current_phase(),
    }

    fixed_value = fixed_summary["total_queue"]
    adaptive_value = adaptive_summary["total_queue"]
    if fixed_value == 0:
        difference = 0.0
    else:
        difference = ((fixed_value - adaptive_value) / fixed_value) * 100.0

    return {
        "fixed": fixed_summary,
        "adaptive": adaptive_summary,
        "difference_percent": difference,
    }


def compare_signal_modes_across_scenarios(scenarios: list[SimulationConfig]):
    """Compare fixed and adaptive modes across multiple traffic scenarios."""
    if not scenarios:
        return {"scenarios": [], "best_mode": "fixed"}

    scenario_results = []
    wins = {"fixed": 0, "adaptive": 0}

    for index, config in enumerate(scenarios):
        result = compare_signal_modes(config)
        fixed_total = float(result["fixed"]["total_queue"])
        adaptive_total = float(result["adaptive"]["total_queue"])

        if adaptive_total < fixed_total:
            winner = "adaptive"
        else:
            winner = "fixed"

        wins[winner] += 1
        scenario_results.append(
            {
                "scenario_index": index,
                "winner": winner,
                "fixed_total_queue": fixed_total,
                "adaptive_total_queue": adaptive_total,
                "difference_percent": float(result["difference_percent"]),
            }
        )

    best_mode = "fixed" if wins["fixed"] >= wins["adaptive"] else "adaptive"
    return {"scenarios": scenario_results, "best_mode": best_mode}


def build_final_report(scenarios: list[SimulationConfig]):
    """Build an executive final report with the aggregate outcome across scenarios."""
    summary = compare_signal_modes_across_scenarios(scenarios)
    scenario_results = summary.get("scenarios", [])

    average_difference = 0.0
    if scenario_results:
        average_difference = sum(float(item.get("difference_percent", 0.0)) for item in scenario_results) / len(scenario_results)

    wins = {"fixed": 0, "adaptive": 0}
    for item in scenario_results:
        winner = item.get("winner", "fixed")
        if winner in wins:
            wins[winner] += 1

    best_mode = summary.get("best_mode", "fixed")
    return {
        "scenarios": scenario_results,
        "best_mode": best_mode,
        "total_scenarios": len(scenario_results),
        "wins": wins,
        "average_difference_percent": float(average_difference),
    }


def build_project_overview(scenarios: list[SimulationConfig]):
    """Return a final verdict summary suitable for the dashboard and presentation."""
    report = build_final_report(scenarios)
    best_mode = report["best_mode"]
    wins = report["wins"]
    average_difference = report["average_difference_percent"]
    mode_label = "Adaptativo" if best_mode == "adaptive" else "Fijo"
    verdict = (
        f"El modo {mode_label.lower()} obtuvo el mejor rendimiento global con "
        f"{wins.get(best_mode, 0)} victorias en {report['total_scenarios']} escenarios. "
        f"La reducción media de congestión fue del {average_difference:.1f}% con respecto al modo fijo."
    )
    return {
        "best_mode": best_mode,
        "wins": wins,
        "average_difference_percent": float(average_difference),
        "verdict": verdict,
    }


def build_final_presentation_summary(scenarios: list[SimulationConfig]):
    """Create the final delivery summary for the project presentation."""
    overview = build_project_overview(scenarios)
    mode_label = "Adaptativo" if overview["best_mode"] == "adaptive" else "Fijo"
    conclusion = (
        f"El sistema de semáforo {mode_label.lower()} muestra la mejor respuesta global en congestión, "
        f"con {overview['wins'].get(overview['best_mode'], 0)} victorias sobre el total de escenarios. "
        f"La mejora media observada es del {overview['average_difference_percent']:.1f}% respecto al modo fijo."
    )
    return {
        "title": "Smart Traffic - Entrega final",
        "best_mode": overview["best_mode"],
        "wins": overview["wins"],
        "average_difference_percent": float(overview["average_difference_percent"]),
        "conclusion": conclusion,
    }
