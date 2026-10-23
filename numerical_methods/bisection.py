"""Bisection method for a congestion target function."""


def bisection(f, a, b, tol=1e-6, max_iter=100):
    """Apply the bisection method when f(a) * f(b) < 0."""
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
        mid = (a + b) / 2.0
        fmid = f(mid)
        error = abs(b - a) / 2.0
        history.append((a, b, mid, fmid, error))

        if abs(fmid) < tol or error < tol:
            return mid, history

        if fa * fmid <= 0:
            b = mid
            fb = fmid
        else:
            a = mid
            fa = fmid

    return (a + b) / 2.0, history
