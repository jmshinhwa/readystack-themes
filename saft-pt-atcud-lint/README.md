# SAF-T (PT) + ATCUD Lint

![SAF-T (PT) + ATCUD Lint](https://getreadystack.com/img/promo/sku114950_result_card.jpg)

O ficheiro SAF-T (PT) só é validado depois de chegar à AT. Até lá, o XML que o seu programa de faturação exporta parece bem-formado: abre no editor, não dá erro de schema no olho humano, e só no portal é que devolve um código de erro — um de cada vez, obrigando a corrigir, reexportar o período inteiro e voltar a submeter.

Esta extensão corre **14 verificações** sobre o ficheiro aberto no VS Code e escreve cada achado com o número da linha e o documento a que pertence. Trabalha em cima do texto: não liga a lado nenhum, não envia o ficheiro, não precisa de rede.

## As 14 verificações

| # | Regra | O que confere |
|---|-------|----------------|
| 1 | `saft_version` | `AuditFileVersion` tem de ser `1.04_01` (Portaria 302/2016) |
| 2 | `nif_checksum` | dígito de controlo (módulo 11) do NIF do emitente e de cada cliente |
| 3 | `atcud_missing` | documento sem elemento `ATCUD` (Portaria 195/2020) |
| 4 | `atcud_format` | forma `CÓDIGO-NÚMERO`, código de validação em maiúsculas |
| 5 | `atcud_seq_mismatch` | a sequência do ATCUD coincide com o número do documento |
| 6 | `invoice_no_format` | `InvoiceNo` na forma `TIPO SÉRIE/NÚMERO`, ex. `FT 2026A/1` |
| 7 | `hash_length` | assinatura RSA-1024/SHA-1 em base64 tem sempre 172 caracteres |
| 8 | `totals_mismatch` | `GrossTotal` = `NetTotal` + `TaxPayable` |
| 9 | `lines_vs_nettotal` | soma das linhas = `NetTotal` |
| 10 | `tax_rate_region` | a taxa existe na região de `TaxCountryRegion` |
| 11 | `exemption_reason_missing` | linha a 0% com código `M01..M99` e motivo |
| 12 | `qr_fields_incomplete` | dados presentes para os campos do QR code (A, B, C, D, E, F, G, H, N, O, Q, R) |
| 13 | `date_out_of_period` | `InvoiceDate` dentro do período do cabeçalho |
| 14 | `date_in_future` | documento datado depois da data de hoje |

## Taxas de IVA por região

A regra muda dentro do mesmo país, e é aí que a geração automática de código falha: no continente (`PT`) as taxas são 0/6/13/23, nos Açores (`PT-AC`) 0/4/9/16 e na Madeira (`PT-MA`) 0/4/5/12/22. Uma linha a 23% com `TaxCountryRegion` `PT-MA` é um erro que nenhum parser de XML apanha — o ficheiro continua bem-formado.

## Medido

Nos ficheiros de exemplo incluídos: `_fixtures/dirty.xml`, com 187 linhas e 3 documentos, devolve 18 achados (15 erros, 3 avisos); `_fixtures/clean.xml`, com 162 linhas, devolve 0.

## Grátis e versão completa

Grátis, sem limite de utilizações e sem marca de água: o ficheiro aberto é analisado por inteiro, com as 14 verificações e todos os achados.

Versão completa (chave de licença, $29, uma vez): a mesma análise em toda a pasta de exportações de uma vez e um relatório CSV/JSON por ficheiro, para o contabilista arquivar como prova de validação — https://buy.polar.sh/polar_cl_7CPHXouwL4TOLFSh30h3VBqFBoIpKPBtY3n9I1d5I7p

## Medida de comparação

À mão, o mesmo trabalho é percorrer 187 linhas de XML e 3 documentos por exportação e conferir o ATCUD contra a numeração documento a documento — e repetir tudo quando a AT devolve o ficheiro.

## A mesma análise no browser

O mesmo motor (`ext/engine.js` + `ext/rules.json`) corre numa página só: https://getreadystack.com/tools/saft-pt-atcud-lint
