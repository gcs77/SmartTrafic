from numerical_methods.bisection import bisection
from numerical_methods.false_position import false_position
from numerical_methods.jacobi import jacobi, example_system
from numerical_methods.newton_interpolation import divided_differences, newton_polynomial
from numerical_methods.romberg import romberg
from numerical_methods.simpson import simpson


def test_jacobi_example_matches_traffic_model():
    A, b, x0 = example_system()
    solution, _ = jacobi(A, b, x0, tol=1e-10, max_iter=100)
    assert abs(solution[0] - 1.2758620689655173) < 1e-4
    assert abs(solution[1] - 1.689655172413793) < 1e-4


def test_bisection_example_estimates_root():
    f = lambda x: x ** 2 - 4
    root, history = bisection(f, 0.0, 5.0, tol=1e-8, max_iter=50)
    assert abs(root - 2.0) < 1e-5
    assert len(history) > 0


def test_false_position_example_estimates_root():
    f = lambda x: x ** 2 - 4
    root, history = false_position(f, 0.0, 5.0, tol=1e-8, max_iter=50)
    assert abs(root - 2.0) < 1e-5
    assert len(history) > 0


def test_simpson_example_matches_known_integral():
    f = lambda x: x ** 2
    value = simpson(f, 0.0, 2.0, 4)
    assert abs(value - (8.0 / 3.0)) < 1e-4


def test_romberg_uses_trapezoid_and_recurrence():
    f = lambda x: x ** 2
    table = romberg(f, 0.0, 2.0, levels=3)
    assert len(table) == 3
    assert abs(table[-1][-1] - (8.0 / 3.0)) < 1e-2


def test_newton_interpolation_matches_reference_point():
    points = [(0, 0), (1, 1), (2, 4)]
    table = divided_differences(points)
    assert len(table) == 3
    value = newton_polynomial(points, 1.5)
    assert abs(value - 2.25) < 1e-6
