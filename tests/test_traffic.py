from simulation.traffic import IntersectionModel, TrafficDirection


def test_direction_queue_updates_without_negative_values():
    direction = TrafficDirection("N", arrival_rate=2.0, service_rate=1.5, initial_queue=5)
    next_queue = direction.next_queue(green_light=True, dt=1.0)
    assert next_queue >= 0


def test_signal_safety_prevents_conflict():
    model = IntersectionModel(
        TrafficDirection("N", arrival_rate=1.0, service_rate=1.0, initial_queue=1),
        TrafficDirection("S", arrival_rate=1.0, service_rate=1.0, initial_queue=1),
    )
    assert model.signal_is_safe(True, True) is False
    assert model.signal_is_safe(True, False) is True
