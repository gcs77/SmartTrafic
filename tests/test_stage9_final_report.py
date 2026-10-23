from simulation.traffic import SimulationConfig, build_final_report


def test_build_final_report_returns_executive_summary():
    scenarios = [
        SimulationConfig(arrival_a=1.5, arrival_b=1.2, green_time=5.0, total_time=10.0),
        SimulationConfig(arrival_a=2.0, arrival_b=2.4, green_time=6.0, total_time=12.0),
    ]

    report = build_final_report(scenarios)

    assert set(report.keys()) == {"scenarios", "best_mode", "total_scenarios", "wins", "average_difference_percent"}
    assert report["total_scenarios"] == 2
    assert report["best_mode"] in {"fixed", "adaptive"}
    assert report["wins"]["fixed"] + report["wins"]["adaptive"] == 2
    assert isinstance(report["average_difference_percent"], float)
