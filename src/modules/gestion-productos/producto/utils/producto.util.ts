const SIN_MARCA = 'sin marca';
const SIN_LINEA = 'sin linea';
const SIN_PRESENTACION = 'sin presentacion';

export function normalizarParteDenominacion(
  parte: string | null | undefined,
): string {
  const texto = (parte ?? '').trim();
  if (!texto) return '';
  const lower = texto.toLowerCase();
  if (
    lower === SIN_MARCA ||
    lower === SIN_LINEA ||
    lower === SIN_PRESENTACION
  ) {
    return '';
  }
  return texto.toLowerCase();
}

/**
 * Genera la denominación de un producto a partir de sus relaciones:
 * - Marca + Línea + Presentación concatenadas con un espacio.
 * - Omite partes vacías, nulas y los placeholders "SIN MARCA",
 *   "SIN LINEA" y "SIN PRESENTACION".
 */
export function generarDenominacionProducto(
  marca?: string | null,
  linea?: string | null,
  presentacion?: string | null,
): string {
  return [
    normalizarParteDenominacion(marca),
    normalizarParteDenominacion(linea),
    normalizarParteDenominacion(presentacion),
  ]
    .filter(Boolean)
    .join(' ');
}