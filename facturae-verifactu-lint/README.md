# Facturae 3.2.2 / Veri*factu Lint (Espana)

![Facturae 3.2.2 / Veri*factu Lint (Espana)](https://getreadystack.com/img/promo/sku46887_result_card.jpg)

Una extension para VS Code que lee un XML **Facturae** y te dice, linea a linea, por que FACe lo va a devolver.

## Por que existe

Cada vez mas facturas electronicas espanolas las genera codigo, y cada vez mas ese codigo lo escribe un asistente de IA. El XML que sale *parece* correcto: la estructura es plausible, los nombres de las etiquetas suenan bien y el fichero abre sin error. Lo que el asistente no hace es calcular la letra de control de un NIF, ni comprobar que `21,00 %` sobre `4.250,00` son `892,50` y no la cifra que quedo del ejemplo anterior, ni saber que `Modality` solo admite `I` o `L`. El validador de FACe si lo hace, y lo hace despues de que hayas enviado la factura.

Esta extension hace esa comprobacion antes, en el editor, sin subir nada a ningun sitio.

## Las 18 reglas

**Cabecera del fichero** — `SchemaVersion` presente y no anterior a 3.2.2; `Modality` en `I` / `L`; `InvoiceIssuerType` en `EM` / `RE` / `TE`; `InvoicesCount` igual al numero real de elementos `<Invoice>`; `TotalInvoicesAmount` igual a la suma de los `InvoiceTotal` del lote.

**Identificacion fiscal** — `TaxIdentificationNumber` con el digito o la letra de control recalculados de verdad: NIF de persona fisica (modulo 23), NIE con prefijo X/Y/Z y CIF de persona juridica con el algoritmo de posiciones pares e impares. `PersonTypeCode` en `F` / `J`. `ResidenceTypeCode` en `E` / `R` / `U`.

**Factura** — `InvoiceDocumentType` en `FC` / `FA` / `AF`; `InvoiceClass` en `OO` / `OR` / `OC` / `CO` / `CR` / `CI`; `IssueDate` en formato `AAAA-MM-DD` y no posterior a hoy; moneda distinta de EUR sin bloque `ExchangeRateDetails`.

**Aritmetica** — tipo de IVA fuera de los vigentes en Espana (21, 10, 4 o 0); cuota que no cuadra con base imponible por tipo; `InvoiceTotal` que no cuadra con bruto antes de impuestos mas repercutidos menos retenidos, que es donde se pierde la retencion de IRPF.

**Firma y encadenamiento** — ausencia de `ds:Signature` (FACe solo admite Facturae firmada en XAdES); registro Veri*factu sin `Huella`, `Encadenamiento` o `IDVersion`.

## Que hace gratis y que pide clave

Gratis, sin clave y sin limite de usos: **la factura abierta en el editor, con las 18 reglas y todos los hallazgos**. No hay marca de agua, ni cuenta atras, ni resultados ocultos.

La parte de pago esta en otro eje: **barrer todo el espacio de trabajo** — la carpeta entera de un cliente, un mes completo de facturas — y **escribir un informe fechado** en un fichero que te llevas y puedes adjuntar a un expediente. $29 una vez, una clave por persona o puesto de CI, 7 dias de reembolso integro. Referencia: una hora de gestoria en Espana se factura habitualmente entre 40 y 60 EUR.

Clave: <https://buy.polar.sh/polar_cl_OsiUcPT9Hbx1kJ35oWK3KjwcKxIRMfjV7HP581OIf8N>

## La misma comprobacion en el navegador

El motor (`engine.js` + `rules.json`) es un unico fichero que corre igual dentro de VS Code y dentro de una pagina. La version web, gratuita y sin registro, esta en <https://getreadystack.com/tools/facturae-verifactu-lint> — pegas el XML y ves los mismos hallazgos, con las mismas lineas.

## Ficheros de ejemplo

El paquete trae `_fixtures/clean.xml` (una factura de 4.505,00 EUR con IVA al 21 % e IRPF al 15 %, que pasa las 18 reglas con cero hallazgos) y `_fixtures/dirty.xml` (la misma factura con los fallos tipicos: 15 hallazgos, 13 errores y 2 avisos).

## Ordenes

`Facturae 3.2.2 / Veri*factu Lint: Check File` (`facturaeVerifactu.checkFile`) — gratis, la factura abierta.
`Facturae 3.2.2 / Veri*factu Lint: Check Workspace` (`facturaeVerifactu.checkWorkspace`) — barrido e informe.
`Facturae 3.2.2 / Veri*factu Lint: Enter Key` (`facturaeVerifactu.enterKey`) — introducir la clave.

## Licencia

Ver `LICENSE.txt`.
