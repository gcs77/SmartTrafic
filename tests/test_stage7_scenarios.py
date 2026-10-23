from simulation.traffic import SimulationConfig, compare_signal_modes_across_scenarios


def test_compare_signal_modes_across_scenarios_returns_summary():
    scenarios = [
        SimulationConfig(arrival_a=1.5, arrival_b=1.2, green_time=5.0, total_time=10.0),
        SimulationConfig(arrival_a=2.0, arrival_b=2.4, green_time=6.0, total_time=12.0),
    ]

    result = compare_signal_modes_across_scenarios(scenarios)

    assert set(result.keys()) == {"scenarios", "best_mode"}
    assert len(result["scenarios"]) == 2
    assert result["best_mode"] in {"fixed", "adaptive"}
    assert all(item["winner"] in {"fixed", "adaptive"} for item in result["scenarios"])
