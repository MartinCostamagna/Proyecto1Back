import {
  normalizarParteDenominacion,
  generarDenominacionProducto,
  parsearTokensBusqueda,
} from './producto.util';

describe('producto.util', () => {
  describe('parsearTokensBusqueda', () => {
    it('debería devolver array vacío si es null, undefined o vacío', () => {
      expect(parsearTokensBusqueda(null)).toEqual([]);
      expect(parsearTokensBusqueda(undefined)).toEqual([]);
      expect(parsearTokensBusqueda('')).toEqual([]);
    });

    it('debería separar por espacios y normalizar a mayúsculas', () => {
      expect(parsearTokensBusqueda('COCA 500')).toEqual(['COCA', '500']);
      expect(parsearTokensBusqueda('coca cola gaseosa 500ml')).toEqual([
        'COCA',
        'COLA',
        'GASEOSA',
        '500ML',
      ]);
    });

    it('debería colapsar espacios múltiples y recortar bordes', () => {
      expect(parsearTokensBusqueda('   COCA   500  ')).toEqual(['COCA', '500']);
    });

    it('debería devolver array vacío si solo hay espacios', () => {
      expect(parsearTokensBusqueda('    ')).toEqual([]);
    });
  });
  describe('normalizarParteDenominacion', () => {
    it('debería devolver cadena vacía si es null o undefined', () => {
      expect(normalizarParteDenominacion(null)).toBe('');
      expect(normalizarParteDenominacion(undefined)).toBe('');
    });

    it('debería recortar espacios', () => {
      expect(normalizarParteDenominacion('  Coca  ')).toBe('coca');
    });

    it('debería devolver cadena vacía para "SIN MARCA" (insensible a mayúsculas)', () => {
      expect(normalizarParteDenominacion('SIN MARCA')).toBe('');
      expect(normalizarParteDenominacion('sin marca')).toBe('');
      expect(normalizarParteDenominacion(' Sin Marca ')).toBe('');
    });

    it('debería devolver cadena vacía para "SIN LINEA"', () => {
      expect(normalizarParteDenominacion('SIN LINEA')).toBe('');
      expect(normalizarParteDenominacion('sin linea')).toBe('');
    });

    it('debería devolver cadena vacía para "SIN PRESENTACION"', () => {
      expect(normalizarParteDenominacion('SIN PRESENTACION')).toBe('');
      expect(normalizarParteDenominacion('sin presentacion')).toBe('');
    });

    it('debería conservar partes válidas pasándolas a minúsculas', () => {
      expect(normalizarParteDenominacion('Coca-Cola')).toBe('coca-cola');
    });
  });

  describe('generarDenominacionProducto', () => {
    it('debería concatenar Marca + Línea + Presentación en minúsculas', () => {
      expect(
        generarDenominacionProducto('Coca-Cola', 'Gaseosas', '1.5L'),
      ).toBe('coca-cola gaseosas 1.5l');
    });

    it('debería omitir las partes vacías y no dejar espacios dobles', () => {
      expect(generarDenominacionProducto('Coca-Cola', '', '1.5L')).toBe(
        'coca-cola 1.5l',
      );
    });

    it('debería omitir las partes nulas', () => {
      expect(generarDenominacionProducto(null, 'Gaseosas', null)).toBe(
        'gaseosas',
      );
    });

    it('debería omitir los placeholders SIN MARCA / SIN LINEA', () => {
      expect(
        generarDenominacionProducto('SIN MARCA', 'SIN LINEA', 'Pack'),
      ).toBe('pack');
    });

    it('debería devolver cadena vacía si todo es vacío o placeholder', () => {
      expect(generarDenominacionProducto(null, '  ', 'SIN PRESENTACION')).toBe(
        '',
      );
    });
  });
});