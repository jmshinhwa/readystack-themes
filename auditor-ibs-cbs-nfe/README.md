# Auditor IBS/CBS para NF-e — NT 2025.002

![Auditor IBS/CBS para NF-e — NT 2025.002](https://getreadystack.com/img/promo/sku25994_result_card.jpg)

Você abre o XML, roda `Auditar este XML de NF-e`, e o painel devolve isto:

| Linha | Ocorrência |
|---|---|
| 6 | `cClassTrib` 000000 é valor de rascunho — a tabela oficial começa em 000001 |
| 7 | Vírgula decimal em campo numérico: `<vBC>1500,00</vBC>` |
| 8 | `pIBSUF` fora do previsto para 2026 — deve ser 0,1% |
| 9 | `pIBSMun` diferente de zero — em 2026 a parcela municipal é zero (art. 343, LC 214/2025) |
| 10 | `pCBS` fora do previsto para 2026 — deve ser 0,9% |
| 15 | Grupo `<gIBSCBS/>` vazio — autorizado pela SEFAZ, irregular perante a lei |

**Seis ocorrências. E a SEFAZ autorizou esse documento sem reclamar de nenhuma.**

## Por que a SEFAZ deixou passar

O **Ato Técnico Conjunto CGIBS/RFB nº 1, de 31/07/2026** suspendeu as regras de validação:
documentos fiscais não são mais rejeitados pela ausência dos campos de CBS e IBS.
Oito códigos de rejeição ficaram inativos.

O **Ato Conjunto RFB/CGIBS nº 4, de 30/07/2026** manteve a obrigação de emitir com esses
campos a partir de **03/08/2026**, em escalonamento até 01/01/2027.

> Caiu a rejeição técnica, não a obrigação legal.

Ou seja: o retorno da SEFAZ deixou de ser o seu teste. O XML errado é autorizado em silêncio,
o protocolo volta com sucesso e o log fica limpo.

## As 11 regras

Grupo vazio · `pIBSUF` ≠ 0,1% em 2026 · `pCBS` ≠ 0,9% em 2026 · `pIBSMun` ≠ 0 em 2026 ·
`cClassTrib` fora dos 6 dígitos · `cClassTrib` 000000 · vírgula decimal · mais de 2 casas
decimais · espaço em branco dentro de campo fiscal · `gIBSMun` omitido após `gIBSUF` ·
valor negativo no grupo IBS/CBS.

Cada ocorrência traz linha, motivo em português e a correção pronta.

## Gratuito — sem marca d'água, sem limite de uso

- Audita o **XML aberto inteiro**, offline, com as 11 regras
- Audita apenas o trecho selecionado
- Reabre o painel com o último laudo
- Lista as regras e o que cada uma verifica

O documento fiscal **não sai da sua máquina**. Nada é enviado para nenhum servidor.

## Com licença — quando deixa de ser um arquivo

- **Auditar o workspace inteiro** — varre todos os `.xml` do projeto de uma vez
- **Laudo em arquivo (CSV/JSON/HTML)** — para anexar ao chamado ou mandar ao contador
- **Saída JSON para o CI** — quebra o build antes de subir XML fora da NT

$29, uma única vez · uma chave por pessoa ou assento de equipe · reembolso total em 7 dias.
Assinaturas de apoio à Reforma Tributária para times fiscais partem de R$ 147/mês.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

[**Obter a versão completa — $29**](https://getreadystack.com)

## Instalar

```
ext install auditor-ibs-cbs-nfe
```

## Perguntas

**Por que o validador oficial gratuito não resolve?**
O validador da SVRS é uma página web que recebe um arquivo por vez e exige subir documento
fiscal com CNPJ e valores do cliente. Não abre dentro do editor, não varre um projeto com
milhares de XMLs e não entra no pipeline de CI.

**As alíquotas de 2026 são mesmo fixas?**
Sim. Em 2026 o preenchimento é de teste: IBS 0,1% (integralmente na parcela estadual) e
CBS 0,9%. Benefício se declara no grupo de redução, nunca zerando a alíquota-base.

---

Fontes: NT 2025.002-RTC · Ato Técnico Conjunto CGIBS/RFB nº 1 (31/07/2026) ·
Ato Conjunto RFB/CGIBS nº 4 (30/07/2026) · LC nº 214/2025.
