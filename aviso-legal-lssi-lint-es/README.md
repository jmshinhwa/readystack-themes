# Aviso Legal ES: leyes derogadas y datos LSSI

¿El aviso legal que entregas con la web cita la **LOPD 15/1999**? Esa ley está derogada desde el **07/12/2018** (disposición derogatoria única de la LOPDGDD 3/2018), y la **Directiva 95/46/CE** que muchas plantillas siguen nombrando lo está desde el **25/05/2018** (art. 94 del RGPD). Los generadores gratuitos y los asistentes de IA reproducen esas plantillas de 2010 con toda naturalidad: el texto suena legal, y es precisamente por eso que nadie lo vuelve a leer.

Esta extensión abre tus páginas legales (`.md`, `.html`, `.php`, `.txt`) y marca, **con artículo y número de línea**, dos cosas: las normas derogadas que citas y los datos obligatorios del **art. 10 de la Ley 34/2002 (LSSI)** que faltan.

## Qué revisa — 17 reglas

| Regla | Norma |
|---|---|
| Cita a la LOPD 15/1999 | LOPDGDD 3/2018, disp. derogatoria única |
| Cita a la Directiva 95/46/CE | art. 94 RGPD (UE) 2016/679 |
| Fichero "inscrito" en el Registro General de Protección de Datos | art. 30 RGPD (registro interno de actividades) |
| Cita al RD 1720/2007 como base | vigente solo en lo que no contradiga el RGPD |
| Consentimiento tácito de cookies ("si continúa navegando") | art. 22.2 LSSI · Guía de cookies de la AEPD (2023) |
| Aviso de cookies sin opción de rechazar | Guía de cookies de la AEPD (2023) |
| Sumisión expresa a un fuero ajeno al consumidor | art. 90.2 TRLGDCU (RDL 1/2007) |
| Texto de plantilla sin rellenar | art. 10 LSSI |
| Año del copyright anterior al año en curso | — |
| NIF o CIF del titular | art. 10.1.a LSSI |
| Domicilio | art. 10.1.a LSSI |
| Contacto directo y efectivo | art. 10.1.a LSSI |
| Inscripción en el Registro Mercantil (sociedades) | art. 10.1.b LSSI |
| Colegio y número de colegiado (profesión regulada) | art. 10.1.d LSSI |
| Base jurídica del tratamiento | art. 13.1.c RGPD |
| Derechos del RGPD más allá de ARCO | arts. 15 a 22 RGPD |
| Derecho a reclamar ante la AEPD | art. 13.2.d RGPD |

## Medido sobre la página de ejemplo

Los ficheros `_fixtures/` de este repositorio son dos páginas legales reales de un estudio de diseño web. Sobre `dirty.md` (una plantilla copiada, 27 líneas) el motor devuelve **15 hallazgos: 9 errores y 6 avisos**. Sobre `clean.md`, **0 hallazgos**. Son los mismos números que verás tú al ejecutar el comando.

## Uso

1. Abre `aviso-legal.md`, `privacidad.html` o la plantilla PHP de tu tema.
2. Paleta de comandos → **Aviso Legal ES: revisar este archivo**.
3. Cada hallazgo aparece con su artículo y su línea en el panel de problemas.

## Gratis y completo

Revisar el archivo abierto es gratuito y termina el trabajo: ves los 17 controles, el artículo que los respalda y la línea exacta. No hay marca de agua, ni límite de usos, ni respuestas ocultas.

La parte de pago cambia de eje, no de profundidad: **revisar de una vez todas las páginas del proyecto** y **exportar el informe** (Markdown/CSV) con artículo y línea para el expediente del cliente, con uso comercial y de equipo. **$29** una vez, una clave por persona o puesto de equipo, devolución íntegra en 7 días.

Enlace de la versión completa: https://buy.polar.sh/polar_cl_K6TixpF3i1BJP3xqX0Fpf1AgISxxQr8BOj04s0HtxJ0

## Por qué no basta lo gratuito que ya tienes

Un generador de textos legales te devuelve una plantilla nueva: no lee la que ya está publicada en el repositorio del cliente, no te dice en qué línea está el problema y no distingue un aviso de autónomo de uno de S.L. Un asistente de IA opina sobre el texto que le pegas, pero reproduce las mismas plantillas antiguas y no deja rastro citable.

## Referencia (jalón de precio)

Un pack de textos legales para web (aviso legal, privacidad y cookies) redactado a medida por un despacho en España cuesta entre 90 € y 300 €. La sanción por infracción leve de la LSSI llega hasta 30.000 € (art. 39.1.c de la Ley 34/2002).

## El mismo motor, también en el navegador

La versión web gratuita usa `engine.js` y `rules.json` sin modificar, byte a byte: https://getreadystack.com/tools/aviso-legal-lssi-lint-es

## Aviso

Esta herramienta señala citas a normas derogadas y datos ausentes según el texto de la ley. No es asesoramiento jurídico y no sustituye la revisión de un profesional para casos con tratamiento de datos sensibles, transferencias internacionales o comercio electrónico.
