# Smart Traffic

Proyecto académico para la asignatura de Métodos Numéricos de Ingeniería Informática.

## Etapa 1: modelo matemático de la intersección

### 1. Problema real
La congestión vehicular en una intersección ocurre cuando la demanda de vehículos supera la capacidad de servicio del semáforo. Si una dirección tiene mucho más flujo que la otra, la fila crece rápidamente y se generan tiempos de espera mayores. El objetivo del simulador es comparar:

- un sistema de semáforos de tiempos fijos
- un sistema adaptativo con tiempos calculados mediante métodos numéricos

### 2. Variables del modelo
Para cada dirección, se define:

- $\lambda_i$: tasa de llegada de vehículos por segundo en la dirección $i$
- $\mu_i$: tasa de salida de vehículos por segundo cuando la luz es verde
- $Q_i(t)$: cantidad de vehículos esperando en la fila en el instante $t$
- $W_i(t)$: tiempo de espera acumulado de esa fila
- $T_{verde}$: duración de la fase verde
- $T_{amarilla}$: duración de la luz amarilla
- $T_{ciclo}$: duración total del ciclo del semáforo
- $T_{sim}$: duración total de la simulación

La fila se modela como una acumulación dinámica:

$$
Q_i(t + \Delta t) = Q_i(t) + \lambda_i \Delta t - \mu_i \Delta t
$$

cuando la dirección tiene permiso de paso y el flujo de salida no supera la capacidad. Si la luz es roja, la ecuación se comporta como:

$$
Q_i(t + \Delta t) = Q_i(t) + \lambda_i \Delta t
$$

y la salida queda limitada a cero.

### 3. Condición de servicio útil
La capacidad del semáforo debe satisfacer:

$$
\mu_i \cdot T_{verde} \geq \lambda_i \cdot T_{ciclo}
$$

cuando se desea evitar una fila creciente en promedio. Si esta condición falla, la congestión tiende a aumentar y el sistema requiere ajuste del tiempo verde.

### 4. Congestión acumulada
La congestión acumulada en vehículos·segundo se define como:

$$
C = \int_0^T Q(t)\,dt
$$

donde $Q(t)$ puede ser la suma de las filas de ambas direcciones o una fila específica en un intervalo de tiempo.

Esta cantidad permite comparar qué sistema genera menos espera total y ayuda a evaluar la eficacia del semáforo inteligente.

### 5. Relación con los métodos numéricos
La simulación no solo dibuja vehículos; también necesita cálculos matemáticos que transformen observaciones del tráfico en decisiones.

- Jacobi: resolver un sistema lineal que represente un flujo simplificado entre dos direcciones.
- Bisección: buscar la duración del verde que reduce la congestión hasta un objetivo.
- Regla falsa: resolver el mismo objetivo y comparar iteraciones con la bisección.
- Simpson: aproximar la integral de congestión acumulada.
- Romberg: aproximar la misma integral con la regla del trapecio y la tabla de niveles vistos en clase.
- Newton: interpolar la tasa de llegada en un instante intermedio entre mediciones.

### 6. Modelo lineal simplificado para Jacobi
Se propone un sistema de dos ecuaciones para dos direcciones:

$$
\begin{cases}
5x_1 - 2x_2 = 3 \\
-3x_1 + 7x_2 = 8
\end{cases}
$$

La matriz asociada es

$$
A = \begin{bmatrix} 5 & -2 \\ -3 & 7 \end{bmatrix}, \quad b = \begin{bmatrix} 3 \\ 8 \end{bmatrix}
$$

y la interpretación física es la siguiente:

- $x_1$: nivel de congestión estimado de la dirección 1
- $x_2$: nivel de congestión estimado de la dirección 2
- los coeficientes representan intercambio y equilibrio entre las dos filas
- $b$ representa la demanda efectiva o flujo de entrada en cada dirección

Esto permite aplicar Jacobi para estimar una solución estable del sistema a partir de las condiciones iniciales.

### 7. Modelo para bisección y regla falsa
Se buscará una duración $x$ de luz verde que cumpla una meta de congestión. Por ejemplo:

$$
f(x) = Q_{objetivo} - Q(x)
$$

donde $Q(x)$ representa la longitud esperada de la fila para una duración $x$ de luz verde.

Si la función cambia de signo en un intervalo $[a,b]$, entonces puede aplicarse bisección o regla falsa. Esto garantiza que existe una raíz potencial que hace que la congestión cumpla el objetivo.

Si no existe cambio de signo, el método no es válido para ese intervalo y debe rechazarse.

### 8. Modelo para Simpson y Romberg
La congestión acumulada se aproxima mediante:

$$
C = \int_0^T Q(t)\,dt
$$

Se usa una función $Q(t)$ obtenida a partir de los datos simulados o de registros discretos del número de vehículos en espera.

- Simpson requiere que el número de subintervalos sea par.
- Romberg se construye a partir de la regla del trapecio y la secuencia de subdivisiones $n=1,2,4,8,\ldots$.

### 9. Modelo para interpolación de Newton
Si se registran mediciones de la tasa de llegada:

$$
(t_0, y_0), (t_1, y_1), \ldots, (t_n, y_n)
$$

se puede construir un polinomio interpolante de Newton para estimar $y$ en un instante intermedio $t$.

Esto permite analizar cómo cambia la demanda entre dos mediciones y predecir si la fila crecerá o se estabilizará.

Se debe distinguir claramente entre:

- interpolación: estimación dentro del intervalo de los datos
- extrapolación: estimación fuera del intervalo, que no debe presentarse como un valor observado

### 10. Confirmación pendiente: Romberg
Antes de implementar la tabla completa de Romberg, se debe confirmar la fórmula recursiva exacta que el profesor haya mostrado en clase. Mientras no se disponga de esa expresión, la implementación se dejará como pendiente para evitar inventar una versión no autorizada.

## Estructura del proyecto

```text
smart-traffic/
  app.py
  requirements.txt
  README.md
  simulation/
    __init__.py
    traffic.py
    statistics.py
    signal_strategy.py
  numerical_methods/
    __init__.py
    jacobi.py
    bisection.py
    false_position.py
    simpson.py
    romberg.py
    newton_interpolation.py
  tests/
    test_traffic.py
    test_methods.py
  templates/
    index.html
  static/
    css/styles.css
    js/simulation.js
    js/charts.js
```

## Cómo usarlo en tu PC

1. Abre una terminal en la carpeta del proyecto.
2. Crea y activa un entorno virtual si lo deseas:
   - python -m venv .venv
   - .venv\Scripts\activate
3. Instala las dependencias:
   - pip install -r requirements.txt
4. Ejecuta la aplicación:
   - python app.py
5. Abre tu navegador en:
   - http://127.0.0.1:5000
6. Ajusta los parámetros del tráfico y usa los botones de inicio, pausa y reinicio.
7. Revisa la comparación final y el resumen ejecutivo.

## Siguiente paso
La siguiente etapa será construir la simulación básica sin métodos numéricos, manteniendo el modelo anterior como base teórica.

## Etapa 2: simulación básica del tráfico

La simulación básica introduce la lógica principal del sistema:

- dos direcciones con fila y servicio
- alternancia segura de fases verde/roja
- semáforo de tiempos fijos
- actualización de las filas en cada instante de tiempo
- indicadores visuales para el estado del tráfico

La evolución de cada fila se aproxima con:

$$
Q_i(t + \Delta t) = Q_i(t) + \lambda_i \Delta t - S_i \Delta t
$$

donde $S_i$ representa la salida efectiva cuando la luz está en verde.

## Etapa 3: estadísticas y coherencia del modelo

Se incorporan estadísticas reales del sistema para comprobar que cada evento corresponde a la simulación:

- número total de llegadas
- número total de salidas
- vehículos todavía en espera
- longitud máxima de cada fila
- tiempo promedio de espera
- congestión acumulada

La congestión acumulada se calcula como:

$$
C = \int_0^T Q(t)\,dt
$$

y se cuantifica en vehículos·segundo.

## Etapa 4: validación de cada método numérico con ejemplos conocidos

En esta etapa se prueba cada método por separado con un caso sencillo y verificable. La idea es confirmar que el algoritmo numérico hace lo que dice antes de conectarlo a la simulación real.

### A. Jacobi
Sistema de prueba:

$$
\begin{cases}
5x_1 - 2x_2 = 3 \\
-3x_1 + 7x_2 = 8
\end{cases}
$$

La solución aproximada es:

$$
(x_1, x_2) \approx (1.2759, 1.6897)
$$

Este valor se compara con la convergencia del método iterativo.

### B. Bisección
Se utiliza la función:

$$
f(x) = x^2 - 4
$$

en el intervalo $[0, 5]$.

La raíz exacta es $x = 2$ y el método debe converger a ese valor dentro de la tolerancia indicada.

### C. Regla falsa
Se resuelve el mismo problema:

$$
f(x) = x^2 - 4
$$

con $[0, 5]$. El resultado esperado es la misma raíz $x = 2$.

### D. Simpson
Se integra la función:

$$
\int_0^2 x^2 \, dx
$$

La solución exacta es:

$$
\frac{8}{3} \approx 2.6667
$$

Con un número par de subintervalos, el método debe aproximar ese valor.

### E. Romberg
Se aplica la misma integral:

$$
\int_0^2 x^2 \, dx
$$

y la tabla de Romberg debe acercarse a:

$$
\frac{8}{3} \approx 2.6667
$$

La fórmula recursiva utilizada es:

$$
R(j+1,k) = \frac{4^{k-1}R(j+1,k-1) - R(j,k-1)}{4^{k-1}-1}
$$

### F. Newton
Se utilizan puntos como:

$$
(0,0), (1,1), (2,4)
$$

La interpolación de Newton debe evaluar el polinomio en $x=1.5$ y devolver aproximadamente:

$$
P(1.5) = 2.25
$$

Esto permite observar cómo la tasa de llegada puede estimarse entre mediciones.

### Resultado esperado de la etapa
La etapa 4 se completa cuando cada método:

- resuelve un ejemplo verificable
- verifica sus condiciones de aplicación
- maneja errores y entradas no válidas
- produce un valor numérico consistente con la teoría

Estas comprobaciones se mantienen en la suite de pruebas del proyecto.

## Interfaz con Vue

La interfaz está implementada con Vue 3 usando su compilación global desde CDN; Flask sigue sirviendo la página y generando el resumen de escenarios. Chart.js se mantiene para la gráfica y no se requiere Node.js ni un paso de compilación. Al abrir la aplicación, se necesita conexión a internet para cargar Vue y Chart.js desde sus CDN.

La intersección muestra dos aproximaciones perpendiculares que comparten una zona de conflicto: una dirección cruza con luz verde mientras la otra espera en rojo. El panel numérico actualiza Jacobi para estimar la presión acoplada de las filas, bisección y regla falsa para recomendar y verificar la duración del verde, Newton para pronosticar las filas y Simpson/Romberg para medir la congestión acumulada. En modo adaptativo, las recomendaciones de bisección ajustan la duración de las fases verdes. Cada dirección también muestra sus luces roja, amarilla y verde con etiquetas textuales.

La interfaz organiza los métodos por etapas (estimar, decidir y evaluar), muestra indicadores de cola y usa vehículos animados en vista cenital para visualizar el avance por el cruce.

La simulación de una ciudad está disponible en `http://127.0.0.1:5000/city` y desde el enlace «Explorar ciudad». Representa una red didáctica de cuatro cruces, cada uno con fases horizontales y verticales. El modo inteligente compara la presión de las filas y limita la espera; el modo fijo permite contrastar la estrategia. Las tasas y el mapa son parámetros de demostración, no datos de una ciudad real.

En la primera intersección, cada coche de la fila conserva su identidad al llegar o salir, y las posiciones se reacomodan con transición en lugar de recrear la fila completa.
