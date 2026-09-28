# Privacidad Chile: Ley 21.719 Policy Lint

Marca los fallos de la política de privacidad de un sitio chileno frente al deber de información del **art. 14 ter** de la **Ley 21.719**, que rige desde el **2026-12-01**. Pensado para agencias web, freelancers y estudios con portfolio en WordPress o Elementor que publican la política de sus clientes.

Web gratis (el mismo motor, en el navegador): https://getreadystack.com/es/tools/privacidad-chile-21719-lint

Referencia: una agencia chilena cobra 150.000 a 500.000 pesos por adecuar a la Ley 21.719 un sitio pyme simple (política, banner, registro y formularios).

## Qué marca

17 rules, cada una con la línea que falla y la corrección al lado:

| Regla | Qué busca |
|---|---|
| R01 | Responsable sin nombre y RUT |
| R02 | Sin correo de contacto |
| R03 | Sin domicilio o dirección postal |
| R04 | Sin finalidades del tratamiento |
| R05 | Sin base de licitud |
| R06 | Sin plazo de conservación |
| R07 | Sin destinatarios |
| R08 | Google Analytics, Mailchimp, Meta Pixel, HubSpot, Hotjar, Cloudflare o AWS sin transferencias internacionales |
| R09 | Sin derecho de portabilidad |
| R10 | Sin derecho de bloqueo |
| R11 | Sin reclamo ante la Agencia de Protección de Datos Personales |
| R12 | Perfilamiento o segmentación sin decisiones automatizadas |
| R13 | Sin versión ni fecha de última actualización |
| R14 | «Derechos ARCO» (sigla de México y España) |
| R15 | Ley 19.628 citada sin la Ley 21.719 que la reforma |
| R16 | Norma extranjera: RGPD, GDPR, LOPDGDD, INAI, LFPDPPP |
| R17 | RUT con dígito verificador que no cuadra (módulo 11) |

## Ejemplo medido

La política de ejemplo de `_fixtures/dirty.md` (un estudio de fotografía de Santiago) da **6 fallos**: RUT 76.543.210-K con dígito verificador incorrecto, Ley N° 19.628 sola, derechos ARCO, sin portabilidad, Google Analytics sin transferencias internacionales y sin Agencia de Protección de Datos Personales. La versión corregida (`_fixtures/clean.md`) da 0.

Con la fecha 2026-09-27 cada regla de ausencia añade: «Faltan 65 días para el 2026-12-01, cuando rige la Ley 21.719». Después de esa fecha dice cuántos días lleva vigente.

## Por qué un chatbot no basta

Los generadores y chatbots escriben políticas con «derechos ARCO», citan el RGPD europeo o solo la Ley 19.628 en su texto previo, e inventan RUT de ejemplo. Este lint revisa el texto que ya está publicado, línea por línea, y no envía nada a ningún servidor.

## Uso

1. Abre la política (`.md`, `.html`, `.php` o `.txt` del tema).
2. Ejecuta **Privacidad Chile: Ley 21.719 Policy Lint: Check this file** desde la paleta de comandos.
3. Los fallos aparecen en Problemas, con la corrección en el mensaje.

## Multas

Omitir total o parcialmente el deber de información del art. 14 ter es infracción leve: hasta 5.000 UTM. Las graves llegan hasta 10.000 UTM y las gravísimas hasta 20.000 UTM.

## Límites

Es una revisión de texto, no asesoría legal. No sabe si tus finalidades son ciertas ni si tu base de licitud es la correcta; solo que la política las declare.
