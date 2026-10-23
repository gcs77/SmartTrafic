"""Statistics utilities for the Smart Traffic simulator."""

from dataclasses import dataclass


@dataclass
class TrafficStats:
    arrivals: int = 0
    departures: int = 0
    waiting: int = 0
    max_queue_a: int = 0
    max_queue_b: int = 0
    total_wait_time: float = 0.0
    cumulative_congestion: float = 0.0

    def register_arrival(self, count: int = 1) -> None:
        if count < 0:
            raise ValueError("Arrivals cannot be negative.")
        self.arrivals += int(count)

    def record_departure(self, count: int = 1, wait_time: float = 0.0) -> None:
        if count < 0:
            raise ValueError("Departures cannot be negative.")
        if wait_time < 0:
            raise ValueError("Wait time cannot be negative.")
        self.departures += int(count)
        self.total_wait_time += float(wait_time) * int(count)

    def update_queue(self, queue_a: float, queue_b: float) -> None:
        if queue_a < 0 or queue_b < 0:
            raise ValueError("Queue lengths cannot be negative.")
        self.max_queue_a = max(self.max_queue_a, int(queue_a))
        self.max_queue_b = max(self.max_queue_b, int(queue_b))
        self.waiting = int(queue_a + queue_b)

    def record_snapshot(self, queue_a: float, queue_b: float, dt: float) -> None:
        if queue_a < 0 or queue_b < 0:
            raise ValueError("Queue lengths cannot be negative.")
        if dt < 0:
            raise ValueError("Time step cannot be negative.")
        self.update_queue(queue_a, queue_b)
        self.cumulative_congestion += (queue_a + queue_b) * dt

    def average_wait_time(self) -> float:
        if self.departures == 0:
            return 0.0
        return self.total_wait_time / self.departures
