import { BadRequestException } from '@nestjs/common';
import { Producto } from './producto.entity';
import { HistorialPrecio } from './historial-precio.entity';

/**
 * CR-007 — Invariantes de dominio de la entidad Producto.
 *
 * La regla "el precio de venta debe ser > 0" del CR está garantizada en dos
 * capas: en el service (por DTO) y en la entidad (como red de seguridad ante
 * cualquier otra vía de escritura). Esta suite cubre esa segunda capa.
 */
describe('Producto.validarInvariantes (CR-007)', () => {
  const build = (over: Partial<Producto> = {}) => {
    const producto = new Producto();
    producto.costo = 100;
    producto.precio = 150;
    producto.porcentaje = 50;
    producto.stock = 10;
    producto.stockMinimo = 1;
    Object.assign(producto, over);
    return producto;
  };

  describe('precio de venta > 0', () => {
    it('debería aceptar un precio positivo', () => {
      expect(() => build({ precio: 0.01 }).validarInvariantes()).not.toThrow();
    });

    it('debería rechazar un precio 0', () => {
      expect(() => build({ precio: 0 }).validarInvariantes()).toThrow(
        BadRequestException,
      );
      expect(() => build({ precio: 0 }).validarInvariantes()).toThrow(
        'El precio de venta debe ser mayor a 0.',
      );
    });

    it('debería rechazar un precio negativo', () => {
      expect(() => build({ precio: -1 }).validarInvariantes()).toThrow(
        'El precio de venta debe ser mayor a 0.',
      );
    });

    it('debería aceptar un precio positivo decimal', () => {
      expect(() => build({ precio: 0.01 }).validarInvariantes()).not.toThrow();
    });

    it('debería tolerar precio null (lo cubre la regla del service)', () => {
      expect(() => build({ precio: null as any }).validarInvariantes()).not.toThrow();
    });

    it('debería tolerar precio undefined (lo cubre la regla del service)', () => {
      expect(() => build({ precio: undefined as any }).validarInvariantes()).not.toThrow();
    });
  });

  describe('otras invariantes que no deben interferir con el CR-007', () => {
    it('debería rechazar costo negativo', () => {
      expect(() => build({ costo: -1 }).validarInvariantes()).toThrow(
        'El costo del producto no puede ser un valor negativo.',
      );
    });

    it('debería rechazar porcentaje negativo', () => {
      expect(() => build({ porcentaje: -5 }).validarInvariantes()).toThrow(
        'El porcentaje de margen no puede ser un valor negativo.',
      );
    });

    it('debería rechazar stock negativo', () => {
      expect(() => build({ stock: -1 }).validarInvariantes()).toThrow(
        'El stock actual no puede ser un valor negativo.',
      );
    });

    it('debería rechazar stock mínimo negativo', () => {
      expect(() => build({ stockMinimo: -1 }).validarInvariantes()).toThrow(
        'El stock mínimo no puede ser un valor negativo.',
      );
    });

    it('debería aceptar 0 en costo, stock y stock mínimo', () => {
      expect(() =>
        build({ costo: 0, stock: 0, stockMinimo: 0 }).validarInvariantes(),
      ).not.toThrow();
    });
  });

  describe('el atributo Pack ya no forma parte del dominio', () => {
    it('la entidad no debe declarar utilizesPack ni cantidadPorPack', () => {
      const entidad = new Producto() as any;
      expect(entidad.utilizaPack).toBeUndefined();
      expect(entidad.cantidadPorPack).toBeUndefined();
      expect('utilizaPack' in Producto.prototype).toBe(false);
      expect('cantidadPorPack' in Producto.prototype).toBe(false);
    });
  });
});

describe('HistorialPrecio (CR-007)', () => {
  it('debe tener los 4 campos que exige el CR: anterior, nuevo, fecha y motivo', () => {
    const registro = new HistorialPrecio();
    registro.precioAnterior = 100;
    registro.precioNuevo = 150;
    registro.motivo = 'Aumento de proveedor';
    registro.fecha = new Date('2026-09-25T15:30:00.000Z');

    expect(registro.precioAnterior).toBe(100);
    expect(registro.precioNuevo).toBe(150);
    expect(registro.motivo).toBe('Aumento de proveedor');
    expect(registro.fecha).toBeInstanceOf(Date);
  });

  it('debe exponer la relación con el producto', () => {
    const registro = new HistorialPrecio();
    const producto = new Producto();
    producto.id = 12;
    registro.producto = producto;

    expect(registro.producto.id).toBe(12);
  });

  it('debe registrar quién hizo el cambio (auditoría)', () => {
    const registro = new HistorialPrecio();
    const usuario = { id: 4, denominacion: 'Admin' } as any;
    registro.usuarioCreated = usuario;

    expect(registro.usuarioCreated.denominacion).toBe('Admin');
  });
});
