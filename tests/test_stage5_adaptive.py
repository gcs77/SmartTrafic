from simulation.signal_strategy import AdaptiveSignalStrategy
from simulation.traffic import BasicTrafficSimulation, SimulationConfig


def test_adaptive_signal_strategy_uses_bisection_for_queue_target():
    strategy = AdaptiveSignalStrategy(base_green_time=5.0, target_queue=8.0)
    green_time = strategy.compute_green_time(queue_a=10.0, queue_b=6.0)
    assert green_time > 5.0
    assert green_time < 30.0


def test_basic_simulation_can_switch_to_adaptive_mode():
    sim = BasicTrafficSimulation(SimulationConfig(arrival_a=1.5, arrival_b=1.2, green_time=5.0))
    sim.set_mode("adaptive")
    sim.advance(1.0)
    assert sim.mode == "adaptive"
    assert sim.phase_duration() >= 5.0
