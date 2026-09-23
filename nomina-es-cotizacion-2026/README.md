# Nómina ES: tablas de cotización 2026

![Nómina ES: tablas de cotización 2026](https://getreadystack.com/img/promo/sku190276_result_card.jpg)

Los tipos y topes de cotización a la Seguridad Social **cambian cada 1 de enero**, pero el fichero
de configuración donde tu software de nóminas los guarda (`cotizacion.yml`, `rates.json`, un CSV de
tablas) casi nunca cambia con ellos: se copia del ejercicio anterior y se da por bueno. El error no
salta en ningún test —la nómina sigue calculando— y aparece meses después, en una liquidación de la
TGSS o en una acta de la Inspección.

Esta extensión lee el fichero de tablas que tienes abierto y marca, línea a línea, cada tipo, tope o
tramo que sigue en valores del ejercicio anterior, con el valor oficial de 2026 y la cita del BOE al
lado.

## Qué comprueba (14 reglas)

| Regla | Valor oficial 2026 | Fuente |
|---|---|---|
| Ejercicio de la tabla | 2026 | Orden PJC/297/2026 |
| Tope máximo de la base | 5.101,20 €/mes | Orden PJC/297/2026, art. 2.1 |
| Contingencias comunes (total / empresa / trabajador) | 28,30 % / 23,60 % / 4,70 % | Orden PJC/297/2026, art. 4.a) |
| MEI (total / empresa / trabajador) | 0,90 % / 0,75 % / 0,15 % | LGSS, disp. trans. cuadragésima tercera |
| Solidaridad, tramo 1 | 1,15 % | LGSS, art. 19 bis y disp. trans. cuadragésima segunda |
| Solidaridad, tramo 2 | 1,25 % | LGSS, art. 19 bis y disp. trans. cuadragésima segunda |
| Solidaridad, tramo 3 | 1,46 % | LGSS, art. 19 bis y disp. trans. cuadragésima segunda |
| Límites de los tramos de solidaridad | 10 % y 50 % sobre el tope | LGSS, art. 19 bis |
| Falta el tramo 3 de solidaridad | 1,46 % | LGSS, art. 19 bis |

En 2025 esos mismos valores eran 4.909,50 €/mes de tope, 0,80 % de MEI y 0,92 % / 1,00 % / 1,17 %
de solidaridad. Un modelo de lenguaje entrenado antes de la Orden PJC/297/2026 (BOE de 31 de marzo
de 2026) sigue devolviendo la tabla de 2025; un validador de JSON o de YAML comprueba la sintaxis,
no si el 0,80 % es el del año en curso.

## Cuánto cuesta el fichero desactualizado

Trabajador con retribución de 6.500,00 € al mes, tabla de 2025 frente a los valores de 2026:

- Contingencias comunes: 28,30 % sobre los 191,70 € de base que faltan (5.101,20 − 4.909,50) = **54,25 €/mes**
- MEI: 0,90 % sobre 5.101,20 (45,91 €) menos 0,80 % sobre 4.909,50 (39,28 €) = **6,63 €/mes**
- Solidaridad sobre el exceso: 16,98 € con la tabla de 2026 frente a 15,52 € con la de 2025 = **1,46 €/mes**

Total: **62,34 € al mes por trabajador**, es decir **748,08 € al año**. El ingreso fuera de plazo
añade un recargo del 20 % de la deuda (LGSS, art. 30.1.a), 149,62 € más por ese mismo trabajador.

## Jalón de comparación

Una asesoría laboral en España cobra entre 15 y 30 € por trabajador y mes por la confección de
nóminas (tarifas publicadas de asesorías online, consultadas en septiembre de 2026); en asesoría
presencial la horquilla habitual sube a 35–60 €.

## Uso

1. Abre el fichero de tablas (`.json`, `.yml`, `.yaml`, `.csv`).
2. Paleta de comandos → **Nómina ES: revisar tablas de cotización**.
3. Cada hallazgo aparece en el panel de problemas con el valor oficial y la cita.

Claves reconocidas: `ejercicio`, `tope_maximo_base`, `contingencias_comunes.*`, `mei.*`,
`solidaridad.tramoN.tipo`, `solidaridad.tramoN.hasta_pct`, en YAML plano, JSON, `.env` o CSV de dos
columnas.

## Las mismas reglas, gratis en el navegador

https://getreadystack.com/tools/nomina-es-cotizacion-2026

## Versión completa

Carpeta o monorepo entero de una vez e informe exportable (CSV/JSON) con la cita del BOE de cada
hallazgo, para adjuntarlo al expediente: licencia de $29, pago único, una clave por persona o
puesto de equipo, reembolso íntegro de 7 días — https://buy.polar.sh/polar_cl_zfE7ynZdDkLqsoqqkHHH1XDwdZTbJ2OHKVDgE47ILa8

## Fuentes

- Orden PJC/297/2026, de 30 de marzo (BOE-A-2026-7296), arts. 2 y 4.
- Real Decreto Legislativo 8/2015 (LGSS), art. 19 bis, art. 30 y disposiciones transitorias cuadragésima segunda y cuadragésima tercera.

MIT.
