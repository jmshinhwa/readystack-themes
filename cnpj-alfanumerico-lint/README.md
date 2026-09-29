# CNPJ Alfanumérico Lint — validação de CNPJ no código

![CNPJ Alfanumérico Lint — validação de CNPJ no código](https://getreadystack.com/img/promo/sku336614_result_card.jpg)

Acha no seu código o CNPJ tratado só como número — regex `\d{14}`, `replace(/\D/g, '')`, `parseInt` no cálculo do DV, tipo `number`, coluna `BIGINT` — antes que ele recuse uma empresa nova.

A Receita Federal atribui CNPJ alfanumérico **a partir de julho de 2026**, exclusivamente a novas inscrições (IN RFB nº 2.229/2024). Os CNPJs já existentes não mudam. O formato novo tem 14 caracteres: as 12 primeiras posições (raiz + ordem) aceitam letras e números, e as 2 últimas (DV) continuam numéricas. Exemplo oficial: `12.ABC.345/01DE-35`.

Ferramenta no navegador, mesmo motor: https://getreadystack.com/tools/cnpj-alfanumerico-lint

## O que ele acha

Na amostra de cadastro `_fixtures/dirty.ts` (19 linhas de TypeScript) ele acha **6 linhas** que recusam `12.ABC.345/01DE-35`:

| Linha que quebra | Correção |
|---|---|
| `cnpj: number` | `cnpj: string` |
| `/^\d{14}$/` | `/^[A-Z0-9]{12}\d{2}$/` |
| `.replace(/\D/g, '')` | `.replace(/[^A-Z0-9]/gi, '').toUpperCase()` |
| `parseInt(limpo.charAt(i))` | `limpo.charCodeAt(i) - 48` |
| `cnpj BIGINT` | `cnpj CHAR(14)` |
| `'12.ABC.345/01DE-53'` | `'12.ABC.345/01DE-35'` |

A versão corrigida (`_fixtures/clean.ts`) dá 0 achados.

## As 11 regras

| Regra | Nível | O que marca | Correção |
|---|---|---|---|
| `cnpj-regex-so-digitos` | erro | Regex de CNPJ com 14 dígitos | Use /^[A-Z0-9]{12}\d{2}$/ depois de normalizar para maiúsculas. |
| `cnpj-regex-mascara-digitos` | erro | Regex da máscara 00.000.000/0000-00 só com dígitos | Troque as 12 primeiras posições por [A-Z0-9]; só o DV (2 últimas) continua \d. |
| `cnpj-remove-letras` | erro | Limpeza que apaga letras | Remova só a pontuação: .replace(/[^A-Z0-9]/gi, '').toUpperCase() |
| `cnpj-parse-numero` | erro | CNPJ convertido para número | Guarde e compare o CNPJ como texto de 14 caracteres. |
| `cnpj-dv-digito-a-digito` | erro | DV calculado dígito a dígito | Use o valor ASCII − 48 de cada caractere (A=17, B=18 …): c.charCodeAt(0) - 48. |
| `cnpj-so-digitos-teste` | erro | Teste 'só dígitos' | Teste /^[A-Z0-9]{12}\d{2}$/ (ou isalnum() nas 12 primeiras posições + isdigit() no DV). |
| `cnpj-tipo-numerico` | erro | CNPJ tipado como número | Tipe como string/String (14 caracteres). |
| `cnpj-coluna-numerica` | erro | Coluna numérica no banco | Migre para CHAR(14)/VARCHAR(14) antes do primeiro cliente novo. |
| `cnpj-input-numerico` | aviso | Campo de formulário numérico | Use inputmode="text" com autocapitalize="characters". |
| `cnpj-mascara-so-digitos` | erro | Máscara de digitação só com dígitos | Use um token alfanumérico nas 12 primeiras posições (ex. 'AA.AAA.AAA/AAAA-00' com A = [A-Z0-9]). |
| `cnpj-literal-dv-invalido` | erro | CNPJ de exemplo com DV errado | Recalcule o DV (módulo 11, pesos 2 a 9, letra = ASCII − 48). |

## O DV do CNPJ alfanumérico

Módulo 11 com pesos 2 a 9 da direita para a esquerda; cada caractere vale o código ASCII − 48 (0–9 = 0–9, A = 17, B = 18 …). Resto 0 ou 1 dá DV 0; senão 11 − resto. Função completa, livre para copiar:

```js
function dvParte(base) {
  let soma = 0, peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += (base.charCodeAt(i) - 48) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}
// dvParte('12ABC34501DE') = 3 ; dvParte('12ABC34501DE3') = 5  →  12.ABC.345/01DE-35
```

Régua: o motor recalcula o exemplo oficial da Receita `12.ABC.345/01DE-35` e chega ao mesmo DV 35. Um CNPJ numérico antigo, como `11.222.333/0001-81`, continua válido pelo mesmo algoritmo.

## Grátis e versão completa

- Grátis: verifica o arquivo aberto (ou o código colado no navegador) com as 11 regras e mostra cada linha que recusa um CNPJ alfanumérico, com a correção.
- Versão completa ($29, pagamento único): varre o workspace inteiro de uma vez e exporta um relatório Markdown por arquivo para anexar ao PR ou à auditoria de migração. [Versão completa — varredura do workspace + relatório](https://buy.polar.sh/polar_cl_t3hBAj7L4CQX2J1igNBb92DPpaz6qbT0aY13a1ZalxQ)

Uma chave de licença por pessoa ou assento de equipe. Sem assinatura.

## Uso

1. Abra um arquivo `.ts`, `.js`, `.py`, `.java`, `.cs`, `.php`, `.sql` ou `.prisma`.
2. Os achados aparecem no painel Problems, com a correção na mensagem.
3. Para ignorar uma linha de propósito, adicione o comentário `cnpj-lint-ignore` nela.

Nada sai da sua máquina: o motor roda local, no editor e no navegador.
