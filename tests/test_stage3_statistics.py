from simulation.statistics import TrafficStats


def test_traffic_stats_accumulates_wait_and_congestion():
    stats = TrafficStats()
    stats.register_arrival(3)
    stats.update_queue(queue_a=5, queue_b=2)
    stats.record_departure(count=1, wait_time=4.5)
    stats.record_snapshot(queue_a=5, queue_b=2, dt=2.0)

    assert stats.arrivals == 3
    assert stats.departures == 1
    assert stats.waiting == 7
    assert stats.max_queue_a == 5
    assert stats.max_queue_b == 2
    assert abs(stats.average_wait_time() - 4.5) < 1e-9
    assert stats.cumulative_congestion == 14.0


def test_traffic_stats_rejects_invalid_values():
    stats = TrafficStats()
    try:
        stats.register_arrival(-1)
        assert False, "Expected ValueError for negative arrivals."
    except ValueError:
        pass

    try:
        stats.record_departure(count=-1, wait_time=1.0)
        assert False, "Expected ValueError for negative departures."
    except ValueError:
        pass
