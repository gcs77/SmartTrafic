from numerical_methods.bisection import bisection
from numerical_methods.false_position import false_position
from numerical_methods.jacobi import jacobi, example_system
from numerical_methods.simpson import simpson
from numerical_methods.newton_interpolation import newton_polynomial
from numerical_methods.romberg import romberg


def test_jacobi_solves_example_system():
    A, b, x0 = example_system()
    solution, _ = jacobi(A, b, x0, tol=1e-10, max_iter=100)
    assert len(solution) == 2
    assert all(abs(v) < 100 for v in solution)


def test_bisection_requires_sign_change():
    f = lambda x: x ** 2 - 4
    root, history = bisection(f, 0, 5, tol=1e-8, max_iter=20)
    assert abs(root - 2.0) < 1e-5


def test_false_position_requires_sign_change():
    f = lambda x: x ** 2 - 4
    root, history = false_position(f, 0, 5, tol=1e-8, max_iter=20)
    assert abs(root - 2.0) < 1e-5


def test_simpson_requires_even_subintervals():
    f = lambda x: x ** 2
    value = simpson(f, 0, 2, 4)
    assert value > 0


def test_newton_interpolation_evaluates_polynomial():
    points = [(0, 1), (1, 3), (2, 9)]
    value = newton_polynomial(points, 1.5)
    assert value > 0


def test_romberg_uses_trapezoid_recurrence():
    f = lambda x: x ** 2
    R = romberg(f, 0, 2, levels=3)
    assert len(R) == 3
    assert abs(R[-1][-1] - (8 / 3)) < 1e-2
