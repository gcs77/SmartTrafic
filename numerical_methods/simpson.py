"""Simpson's rule for congestion accumulation."""


def simpson(f, a, b, n):
    """Approximate the integral of f over [a, b] using Simpson's rule.

    n must be even.
    """
    if n % 2 != 0:
        raise ValueError("The number of subintervals must be even for Simpson's rule.")

    h = (b - a) / n
    total = f(a) + f(b)

    for i in range(1, n):
        x = a + i * h
        total += (4 if i % 2 == 1 else 2) * f(x)

    return (h / 3.0) * total
