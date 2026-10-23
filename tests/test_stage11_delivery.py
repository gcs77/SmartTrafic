from simulation.traffic import SimulationConfig, build_final_presentation_summary


def test_build_final_presentation_summary_returns_delivery_data():
    scenarios = [
        SimulationConfig(arrival_a=1.4, arrival_b=1.1, green_time=5.0, total_time=10.0),
        SimulationConfig(arrival_a=2.0, arrival_b=2.2, green_time=6.0, total_time=12.0),
    ]

    summary = build_final_presentation_summary(scenarios)

    assert set(summary.keys()) == {"title", "best_mode", "wins", "average_difference_percent", "conclusion"}
    assert summary["title"] == "Smart Traffic - Entrega final"
    assert summary["best_mode"] in {"fixed", "adaptive"}
    assert isinstance(summary["conclusion"], str)
    assert len(summary["conclusion"]) > 0
