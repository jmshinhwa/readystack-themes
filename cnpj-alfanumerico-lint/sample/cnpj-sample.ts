// cadastro de fornecedor — escrito antes do CNPJ alfanumérico
export interface Fornecedor {
  razaoSocial: string;
  cnpj: number;
}

const CNPJ_RE = /^\d{14}$/;

export function validarCnpj(cnpj: string): boolean {
  const limpo = cnpj.replace(/\D/g, '');
  if (!CNPJ_RE.test(limpo)) return false;
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(limpo.charAt(i)) * [5,4,3,2,9,8,7,6,5,4,3,2][i];
  return true;
}

export const MIGRATION = `CREATE TABLE fornecedor (id SERIAL, cnpj BIGINT NOT NULL);`;

export const EXEMPLO_TESTE = '12.ABC.345/01DE-53';
