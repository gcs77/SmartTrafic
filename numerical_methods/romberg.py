"""Romberg integration via the trapezoidal rule and the class recurrence."""


def romberg(f, a, b, levels=4):
    """Approximate the integral of f over [a, b] using Romberg's method.

    The recurrence used is the standard one from class, equivalent to:
        R(k, j) = (4^j * R(k, j-1) - R(k-1, j-1)) / (4^j - 1)
    with the first row built from the composite trapezoidal rule.
    """
    if levels < 1:
        raise ValueError("levels must be at least 1.")

    table = [[0.0 for _ in range(levels)] for _ in range(levels)]
    table[0][0] = 0.5 * (b - a) * (f(a) + f(b))

    for i in range(1, levels):
        n = 2 ** i
        h = (b - a) / n
        total = 0.0
        for j in range(1, n, 2):
            total += f(a + j * h)

        table[i][0] = 0.5 * table[i - 1][0] + h * total

        for j in range(1, i + 1):
            power = 4 ** j
            table[i][j] = (power * table[i][j - 1] - table[i - 1][j - 1]) / (power - 1)

    return [row[:i + 1] for i, row in enumerate(table)]
