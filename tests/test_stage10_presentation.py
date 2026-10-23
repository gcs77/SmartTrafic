from simulation.traffic import SimulationConfig, build_project_overview


def test_build_project_overview_returns_final_verdict():
    scenarios = [
        SimulationConfig(arrival_a=1.5, arrival_b=1.2, green_time=5.0, total_time=10.0),
        SimulationConfig(arrival_a=2.0, arrival_b=2.4, green_time=6.0, total_time=12.0),
    ]

    overview = build_project_overview(scenarios)

    assert set(overview.keys()) == {"best_mode", "wins", "average_difference_percent", "verdict"}
    assert overview["best_mode"] in {"fixed", "adaptive"}
    assert overview["wins"]["fixed"] + overview["wins"]["adaptive"] == 2
    assert isinstance(overview["verdict"], str)
    assert len(overview["verdict"]) > 0
