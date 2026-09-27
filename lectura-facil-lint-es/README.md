# Accesibilidad cognitiva: lint de lectura fácil

![Accesibilidad cognitiva: lint de lectura fácil](https://getreadystack.com/img/promo/sku306973_result_card.jpg)

**Para equipos de contenido y webs de administraciones públicas en España.** Abre la guía o el formulario de un trámite en Markdown y el lint marca cada fallo de lectura fácil con su línea y cómo arreglarlo. 12 rules · 6 issues on the sample guide · UNE 153101 · RD 707/2026.

Más información: https://getreadystack.com/es/tools/lectura-facil-lint-es

## Por qué ahora

El Real Decreto 707/2026, de 2 de septiembre (BOE-A-2026-18509, publicado el 2026-09-03), aprueba el Reglamento de las condiciones básicas de accesibilidad cognitiva. Entra en vigor el **2027-01-02**. Su artículo 10.2.a pide que las administraciones públicas tengan en lectura fácil los formularios y las guías para hacer los trámites. El artículo 3.i define la lectura fácil con la norma UNE 153101 y el artículo 3.j define el lenguaje claro con la norma UNE-ISO 24495-1. El artículo 21 remite las infracciones al Título III de la Ley General de derechos de las personas con discapacidad.

## Qué revisa (12 reglas)

| Regla | Qué marca | Cómo arreglarlo |
|---|---|---|
| LF01 | Frase de más de 20 palabras | Partir la frase. Una idea por frase |
| LF02 | Punto y coma | Punto y frase nueva |
| LF03 | Número romano (siglo, título, anexo…) | Cifras: título 3 |
| LF04 | Porcentaje (40 %, por ciento) | 4 de cada 10 |
| LF05 | Abreviatura (art., núm., etc., p. ej.) | Palabra completa |
| LF06 | Sigla sin explicar | Nombre completo y sigla entre paréntesis |
| LF07 | Voz pasiva (son revisadas) | Decir quién hace la acción |
| LF08 | Futuro de subjuntivo (hubiere, fuere) | Presente: si recibes |
| LF09 | Fecha solo con números (30/11/2026) | 30 de noviembre de 2026 |
| LF10 | Texto entero en mayúsculas | Minúsculas y negrita |
| LF11 | Cursiva | Quitarla o usar negrita |
| LF12 | Solicitud o formulario sin versión en lectura fácil | Enlazar la versión (art. 10.2.a) y días que faltan hasta el 2027-01-02 |

El umbral de 20 palabras es el valor del lint. Las pautas completas están en la norma UNE 153101, que no reproducimos.

## Ejemplo medido

Guía de ayuda al alquiler de 13 líneas (archivo de prueba `_fixtures/dirty.md`). Resultado: **6 fallos de lectura fácil** (6 issues):

```
L1  LF12 sin versión en lectura fácil · faltan 98 días (hoy 2026-09-26)
L3  LF09 «30/11/2026» → 30 de noviembre de 2026
L5  LF01 frase de 29 palabras → frases cortas
L9  LF04 «40 %» → 4 de cada 10
L11 LF08 «hubiere» → si recibes
L13 LF07 «son revisadas» → la comisión revisa
```

La versión reescrita (`_fixtures/clean.md`) da 0 fallos.

## Cómo se usa

1. Abre un archivo `.md` con la guía o el formulario.
2. Ejecuta **Accesibilidad cognitiva: lint de lectura fácil: Check this file** desde la paleta de comandos.
3. Los fallos salen en el panel de problemas con su línea.

La revisión se hace en tu equipo. El texto no sale de tu ordenador.

## Lo que no hace

El lint no sustituye la validación con personas con dificultades de comprensión. Tampoco reescribe el texto por ti: te dice qué línea cambiar y cómo.

## Versión completa

Con una clave de licencia: revisa toda la carpeta de guías y formularios de una vez y escribe un informe Markdown con los fallos de cada archivo para el expediente de validación.

## Referencias

- BOE-A-2026-18509: https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-18509
