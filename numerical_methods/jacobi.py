"""Jacobi method implementation for a simplified traffic system."""

from typing import List, Tuple


def jacobi(A, b, x0, tol=1e-6, max_iter=100):
    """Solve A x = b using the Jacobi iterative method.

    The system must be diagonally dominant for reliable convergence; otherwise,
    the method may not converge.
    """
    if len(A) != len(b):
        raise ValueError("Matrix A and vector b must have the same length.")

    n = len(A)
    x = list(x0)
    history = [list(x)]

    for _ in range(max_iter):
        x_new = []
        for i in range(n):
            s = 0.0
            for j in range(n):
                if i != j:
                    s += A[i][j] * x[j]
            x_new.append((b[i] - s) / A[i][i])

        history.append(list(x_new))
        if max(abs(x_new[i] - x[i]) for i in range(n)) < tol:
            return x_new, history
        x = x_new

    raise RuntimeError("Jacobi method did not converge within the maximum number of iterations.")


def example_system():
    A = [[5.0, -2.0], [-3.0, 7.0]]
    b = [3.0, 8.0]
    x0 = [0.0, 0.0]
    return A, b, x0
