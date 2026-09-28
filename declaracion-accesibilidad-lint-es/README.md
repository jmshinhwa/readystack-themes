# Declaración de Accesibilidad Lint (RD 1112/2018)

![Declaración de Accesibilidad Lint (RD 1112/2018) — finds the line](https://getreadystack.com/img/promo/declaracion-accesibilidad-lint-es_demo.gif)

![Declaración de Accesibilidad Lint (RD 1112/2018)](https://getreadystack.com/img/promo/sku319525_result_card.jpg)

Revisa el texto de la **declaración de accesibilidad** de una web o app del sector público español contra el **artículo 15 del Real Decreto 1112/2018** y el modelo europeo de la **Decisión de Ejecución (UE) 2018/1523**. Abre `accesibilidad.md` o `declaracion-accesibilidad.html` en VS Code y cada fallo aparece en la línea exacta, con el artículo que lo exige.

Web gratuita con el mismo motor: https://getreadystack.com/es/tools/declaracion-accesibilidad-lint-es

## Para quién

Agencias y equipos de desarrollo que mantienen webs de ayuntamientos, diputaciones, universidades o consejerías en España, y la Unidad responsable de accesibilidad que firma la declaración. Un validador WCAG revisa el HTML de la página; esta extensión revisa el texto legal que acompaña a esa página.

## Qué revisa (11 reglas)

| Regla | Qué comprueba | Base |
|---|---|---|
| DA-01 | Situación de cumplimiento: plenamente, parcialmente o no conforme | Decisión (UE) 2018/1523 |
| DA-02 | Apartado de contenido no accesible, con razones y alternativa | art. 15.2.a |
| DA-03 | Enlace al mecanismo de comunicación (quejas y solicitudes de información accesible) | art. 15.2.b, arts. 10-12 |
| DA-04 | Enlace al registro donde se presenta la reclamación | art. 15.2.c, art. 13.3 |
| DA-05 | Nombre de la Unidad responsable de accesibilidad | art. 13.3 |
| DA-06 | Fecha de revisión presente y de menos de un año | art. 15.1 |
| DA-07 | Plazo de respuesta a quejas: veinte días hábiles | art. 12.3 |
| DA-08 | Plazo de respuesta a la reclamación: dos meses como máximo | art. 13.4 |
| DA-09 | Carga desproporcionada alegada por falta de tiempo, prioridad o conocimientos | RD 1112/2018 |
| DA-10 | Norma superada (UNE 139803:2012, WCAG 2.0) en lugar de UNE-EN 301549:2022 | UNE-EN 301549:2022 |
| DA-11 | Método de preparación: autoevaluación o evaluación por un tercero | Decisión (UE) 2018/1523 |

## Ejemplo

La declaración de muestra (`_fixtures/dirty.md`) da 6 fallos: cita UNE 139803:2012, alega carga desproporcionada «por falta de tiempo», su última revisión es del 12/03/2024, promete responder «en un plazo de un mes», la reclamación no tiene enlace y no nombra la Unidad responsable de accesibilidad. La versión corregida (`_fixtures/clean.md`) da 0 fallos.

## Plazos que la declaración debe decir bien

- La declaración se actualiza **como mínimo una vez al año** (art. 15.1).
- Las quejas y solicitudes de información accesible se responden en **veinte días hábiles** (art. 12.3); el plazo se suspende si se piden aclaraciones, que el interesado aporta en diez días hábiles (art. 12.4).
- La reclamación se responde en un **plazo máximo de dos meses** (art. 13.4).
- Cada Unidad responsable de accesibilidad tiene sus informes anuales disponibles **antes del 1 de octubre** de cada año (RD 1112/2018).

## Uso

1. Abre la declaración (Markdown, HTML o texto).
2. Los fallos aparecen en el panel Problemas al guardar, o con el comando de revisión de la paleta.
3. Cada mensaje cita el artículo, para que la corrección se pueda justificar ante la Unidad responsable.

El análisis es local: el texto no sale de tu equipo.

## Versión completa

La revisión del archivo abierto es gratuita y completa. La versión completa revisa de una vez todas las declaraciones del espacio de trabajo (varias webs o sedes) y exporta un informe por sitio: [versión completa](https://buy.polar.sh/polar_cl_EErHjpDSgGIXOui02UUkO27zK4QJy8aPvGJQJ0So0bH).

## Referencia de coste

Alternativa sin herramienta: releer a mano el art. 15, el art. 12, el art. 13 del RD 1112/2018 y el modelo (UE) 2018/1523 frente a cada declaración, una vez al año y por cada web.

## Límites

La extensión revisa el texto de la declaración, no la accesibilidad de la web. No sustituye la revisión de accesibilidad del art. 17 ni el informe de revisión.

Fuente: Real Decreto 1112/2018, de 7 de septiembre, texto consolidado en BOE (BOE-A-2018-12699).
