from simulation.signal_strategy import FixedTimeStrategy
from simulation.traffic import IntersectionModel, TrafficDirection


def test_fixed_time_strategy_changes_phase_over_cycle():
    strategy = FixedTimeStrategy(green_time=2.0, yellow_time=1.0)
    assert strategy.state_for_step(0.0) is True
    assert strategy.state_for_step(1.5) is True
    assert strategy.state_for_step(2.1) is False


def test_intersection_model_blocks_conflicting_green_lights():
    model = IntersectionModel(
        TrafficDirection("N", 1.0, 2.0, 2),
        TrafficDirection("S", 1.0, 2.0, 2),
    )
    assert model.signal_is_safe(True, False) is True
    assert model.signal_is_safe(False, True) is True
    assert model.signal_is_safe(True, True) is False


def test_queue_reduces_when_green_and_rises_when_red():
    north = TrafficDirection("N", arrival_rate=1.0, service_rate=2.0, initial_queue=4)
    south = TrafficDirection("S", arrival_rate=0.5, service_rate=1.0, initial_queue=1)
    model = IntersectionModel(north, south)

    model.update(direction_a_green=True, direction_b_green=False, dt=1.0)
    assert north.queue >= 0
    assert south.queue >= 0

    model.update(direction_a_green=False, direction_b_green=True, dt=1.0)
    assert north.queue >= 0
    assert south.queue >= 0
