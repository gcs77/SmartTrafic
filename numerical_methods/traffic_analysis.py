"""Numerical-method analysis for the live intersection simulation."""

from __future__ import annotations

import math

from numerical_methods.bisection import bisection
from numerical_methods.false_position import false_position
from numerical_methods.jacobi import jacobi
from numerical_methods.newton_interpolation import newton_polynomial
from numerical_methods.romberg import romberg
from numerical_methods.simpson import simpson


TARGET_QUEUE = 4.0
MAX_GREEN_TIME = 30.0


def _number(value, name: str, *, minimum: float = 0.0) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number.")
    result = float(value)
    if not math.isfinite(result) or result < minimum:
        raise ValueError(f"{name} must be finite and at least {minimum}.")
    return result


def _interpolated_queue(points: list[tuple[float, float]], time: float) -> float:
    if time <= points[0][0]:
        return points[0][1]
    if time >= points[-1][0]:
        return points[-1][1]

    for (left_time, left_value), (right_time, right_value) in zip(points, points[1:]):
        if left_time <= time <= right_time:
            portion = (time - left_time) / (right_time - left_time)
            return left_value + portion * (right_value - left_value)
    return points[-1][1]


def _green_recommendation(
    queue: float, arrival: float, service: float
) -> tuple[float, float, bool, bool, str]:
    if queue <= TARGET_QUEUE:
        return 0.0, 0.0, False, True, "within_target"
    if service <= arrival:
        return MAX_GREEN_TIME, MAX_GREEN_TIME, True, False, "capacity"

    def remaining_queue(green_time: float) -> float:
        return queue - (service - arrival) * green_time - TARGET_QUEUE

    required_time = (queue - TARGET_QUEUE) / (service - arrival)
    if required_time > MAX_GREEN_TIME:
        return MAX_GREEN_TIME, MAX_GREEN_TIME, True, False, "green_limit"
    upper_bound = required_time + 1.0
    bisection_result, _ = bisection(remaining_queue, 0.0, upper_bound, tol=1e-4)
    false_position_result, _ = false_position(remaining_queue, 0.0, upper_bound, tol=1e-4)
    return min(MAX_GREEN_TIME, bisection_result), min(MAX_GREEN_TIME, false_position_result), False, False, "ok"


def analyze_traffic(payload: dict) -> dict:
    """Run the selected methods against the current queues and their history."""
    queues = payload.get("queues")
    rates = payload.get("rates")
    raw_history = payload.get("history", [])
    if not isinstance(queues, dict) or not isinstance(rates, dict) or not isinstance(raw_history, list):
        raise ValueError("queues, rates, and history must be objects, objects, and a list.")

    queue_a = _number(queues.get("A"), "queues.A")
    queue_b = _number(queues.get("B"), "queues.B")
    arrival_a = _number(rates.get("arrivalA"), "rates.arrivalA")
    arrival_b = _number(rates.get("arrivalB"), "rates.arrivalB")
    service_a = _number(rates.get("serviceA"), "rates.serviceA")
    service_b = _number(rates.get("serviceB"), "rates.serviceB")

    jacobi_result, _ = jacobi(
        [[1.0, -0.15], [-0.20, 1.0]],
        [queue_a, queue_b],
        [queue_a, queue_b],
        tol=1e-5,
    )

    history: list[tuple[float, float, float]] = []
    for index, point in enumerate(raw_history[-33:]):
        if not isinstance(point, dict):
            raise ValueError(f"history[{index}] must be an object.")
        time = _number(point.get("time"), f"history[{index}].time")
        value_a = _number(point.get("a"), f"history[{index}].a")
        value_b = _number(point.get("b"), f"history[{index}].b")
        if history and time <= history[-1][0]:
            raise ValueError("History times must be strictly increasing.")
        history.append((time, value_a, value_b))

    forecast_a = queue_a
    forecast_b = queue_b
    integral_simpson = 0.0
    integral_romberg = 0.0
    if len(history) >= 2:
        points_a = [(row[0], row[1]) for row in history]
        points_b = [(row[0], row[2]) for row in history]
        prediction_time = history[-1][0] + 1.0
        if len(history) >= 3:
            forecast_a = max(0.0, newton_polynomial(points_a[-3:], prediction_time))
            forecast_b = max(0.0, newton_polynomial(points_b[-3:], prediction_time))
        else:
            forecast_a = max(0.0, queue_a + arrival_a - service_a)
            forecast_b = max(0.0, queue_b + arrival_b - service_b)

        integration_rows = history
        if len(integration_rows) % 2 == 0:
            integration_rows = integration_rows[1:]
        integration_points_a = [(row[0], row[1] + row[2]) for row in integration_rows]
        start, end = integration_points_a[0][0], integration_points_a[-1][0]
        intervals = len(integration_points_a) - 1
        if intervals >= 2 and end > start:
            queue_curve = lambda time: _interpolated_queue(integration_points_a, time)
            integral_simpson = simpson(queue_curve, start, end, intervals)
            integral_romberg = romberg(queue_curve, start, end, levels=4)[-1][-1]

    planned_queue_a = max(jacobi_result[0], forecast_a)
    planned_queue_b = max(jacobi_result[1], forecast_b)
    green_a, false_a, limited_a, within_target_a, limit_reason_a = _green_recommendation(
        planned_queue_a, arrival_a, service_a
    )
    green_b, false_b, limited_b, within_target_b, limit_reason_b = _green_recommendation(
        planned_queue_b, arrival_b, service_b
    )

    return {
        "targetQueue": TARGET_QUEUE,
        "jacobiA": jacobi_result[0],
        "jacobiB": jacobi_result[1],
        "plannedQueueA": planned_queue_a,
        "plannedQueueB": planned_queue_b,
        "greenA": green_a,
        "greenB": green_b,
        "falseA": false_a,
        "falseB": false_b,
        "limitedA": limited_a,
        "limitedB": limited_b,
        "limitReasonA": limit_reason_a,
        "limitReasonB": limit_reason_b,
        "withinTargetA": within_target_a,
        "withinTargetB": within_target_b,
        "forecastA": forecast_a,
        "forecastB": forecast_b,
        "simpson": integral_simpson,
        "romberg": integral_romberg,
    }
