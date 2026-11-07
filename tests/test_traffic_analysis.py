from numerical_methods.traffic_analysis import analyze_traffic


def test_analysis_applies_all_selected_methods_to_live_queues():
    result = analyze_traffic(
        {
            "queues": {"A": 10, "B": 8},
            "rates": {
                "arrivalA": 1.0,
                "arrivalB": 1.0,
                "serviceA": 3.0,
                "serviceB": 2.5,
            },
            "history": [
                {"time": 0.0, "a": 10, "b": 8},
                {"time": 0.5, "a": 9, "b": 8.5},
                {"time": 1.0, "a": 8, "b": 9},
                {"time": 1.5, "a": 7, "b": 9.5},
                {"time": 2.0, "a": 6, "b": 10},
            ],
        }
    )

    assert result["jacobiA"] > 10
    assert result["jacobiB"] > 8
    assert result["greenA"] > 0
    assert result["greenB"] > 0
    assert abs(result["greenA"] - result["falseA"]) < 0.01
    assert abs(result["greenB"] - result["falseB"]) < 0.01
    assert result["forecastA"] >= 0
    assert result["forecastB"] >= 0
    assert result["simpson"] > 0
    assert result["romberg"] > 0


def test_analysis_rejects_non_increasing_history_times():
    payload = {
        "queues": {"A": 1, "B": 1},
        "rates": {
            "arrivalA": 1,
            "arrivalB": 1,
            "serviceA": 2,
            "serviceB": 2,
        },
        "history": [
            {"time": 1, "a": 1, "b": 1},
            {"time": 1, "a": 1, "b": 1},
        ],
    }

    try:
        analyze_traffic(payload)
    except ValueError as error:
        assert "strictly increasing" in str(error)
    else:
        raise AssertionError("Expected duplicate history timestamps to be rejected.")


def test_analysis_reports_when_service_capacity_cannot_clear_the_target_queue():
    result = analyze_traffic(
        {
            "queues": {"A": 10, "B": 0},
            "rates": {
                "arrivalA": 3.0,
                "arrivalB": 1.0,
                "serviceA": 2.0,
                "serviceB": 2.0,
            },
            "history": [],
        }
    )

    assert result["limitedA"] is True
    assert result["limitReasonA"] == "capacity"
    assert result["greenA"] == 30.0
    assert result["withinTargetB"] is True
