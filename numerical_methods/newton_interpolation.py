"""Newton interpolation using divided differences."""


def divided_differences(points):
    """Return the divided-difference table for a set of points."""
    if len(points) < 2:
        raise ValueError("At least two points are required.")

    x = [p[0] for p in points]
    y = [p[1] for p in points]
    table = [y[:]]

    for degree in range(1, len(x)):
        current = []
        for i in range(len(x) - degree):
            numerator = table[degree - 1][i + 1] - table[degree - 1][i]
            denominator = x[i + degree] - x[i]
            current.append(numerator / denominator)
        table.append(current)

    return table


def newton_polynomial(points, x_value):
    """Evaluate the Newton interpolating polynomial at x_value."""
    x = [p[0] for p in points]
    y = [p[1] for p in points]
    table = divided_differences(points)
    result = table[0][0]
    product = 1.0

    for i in range(1, len(x)):
        product *= (x_value - x[i - 1])
        result += table[i][0] * product

    return result
