"""Signal strategies for the intersection."""


class FixedTimeStrategy:
    """A signal plan with fixed green time per direction."""

    def __init__(self, green_time: float, yellow_time: float = 0.0):
        if green_time <= 0:
            raise ValueError("Green time must be positive.")
        if yellow_time < 0:
            raise ValueError("Yellow time cannot be negative.")
        self.green_time = float(green_time)
        self.yellow_time = float(yellow_time)
        self.cycle_time = self.green_time + self.yellow_time

    def state_for_step(self, elapsed_time: float):
        cycle = elapsed_time % self.cycle_time
        return cycle < self.green_time

    def phase_state(self, elapsed_time: float):
        cycle = elapsed_time % self.cycle_time
        if cycle < self.green_time:
            return {"phase": "A_GREEN", "a_green": True, "b_green": False}
        if cycle < self.green_time + self.yellow_time:
            return {"phase": "YELLOW", "a_green": False, "b_green": False}
        return {"phase": "B_GREEN", "a_green": False, "b_green": True}


class AdaptiveSignalStrategy:
    """Placeholder for a strategy informed by numerical methods."""

    def __init__(self, base_green_time: float, target_queue: float):
        self.base_green_time = base_green_time
        self.target_queue = target_queue

    def compute_green_time(self, queue_a: float, queue_b: float) -> float:
        total_queue = queue_a + queue_b
        if total_queue <= self.target_queue:
            return self.base_green_time
        return self.base_green_time + total_queue / 10.0
