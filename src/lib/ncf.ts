/**
 * NCF (Número de Comprobante Fiscal) utility functions
 * Tipos: B01 = Crédito Fiscal, B02 = Consumidor Final, B14 = Gubernamental
 */

export type NCFTipo = "B01" | "B02" | "B14";

export interface NCFSecuencia {
  id: string;
  tipo: NCFTipo;
  prefix: string;
  secuencia_actual: number;
  secuencia_fin: number;
  activo: boolean;
  vencimiento: string;
}

export function formatNCF(prefix: string, numero: number): string {
  return `${prefix}${String(numero).padStart(8, "0")}`;
}

export function ncfAgotado(secuencia: NCFSecuencia): boolean {
  return secuencia.secuencia_actual >= secuencia.secuencia_fin;
}

export const NCF_LABELS: Record<NCFTipo, string> = {
  B01: "Crédito Fiscal",
  B02: "Consumidor Final",
  B14: "Gubernamental",
};
