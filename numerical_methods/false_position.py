"""False-position method for the congestion target function."""


def false_position(f, a, b, tol=1e-6, max_iter=100):
    """Apply the false-position method when f(a) * f(b) < 0."""
    fa = f(a)
    fb = f(b)

    if fa == 0:
        return a, [(a, b, a, fa, 0.0)]
    if fb == 0:
        return b, [(a, b, b, fb, 0.0)]
    if fa * fb > 0:
        raise ValueError("The interval does not satisfy the sign-change condition.")

    history = []
    for _ in range(max_iter):
        c = (a * fb - b * fa) / (fb - fa)
        fc = f(c)
        error = abs(fc)
        history.append((a, b, c, fc, error))

        if abs(fc) < tol or error < tol:
            return c, history

        if fa * fc <= 0:
            b = c
            fb = fc
        else:
            a = c
            fa = fc

    return (a * fb - b * fa) / (fb - fa), history
