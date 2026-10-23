from simulation.traffic import BasicTrafficSimulation, SimulationConfig, compare_signal_modes


def test_compare_signal_modes_returns_comparable_metrics():
    result = compare_signal_modes(SimulationConfig(arrival_a=1.5, arrival_b=1.2, green_time=5.0, total_time=10.0))
    assert set(result.keys()) == {"fixed", "adaptive", "difference_percent"}
    assert result["fixed"]["total_queue"] >= 0
    assert result["adaptive"]["total_queue"] >= 0
    assert isinstance(result["difference_percent"], float)
