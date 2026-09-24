module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js', 'json'],
    rootDir: '.',
    testRegex: '.*\\.spec\\.ts$', // Ejecutar solo archivos .spec.ts
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: ['src/**/*.ts'],
    collectCoverage: true, // Opcional: Muestra cobertura de código
    coverageDirectory: './coverage',
    coverageThreshold: {
      // Umbral 80% justificado para los archivos de reglas de negocio de los
      // CR-002/CR-005 que los specs ejercitan. Los archivos de infraestructura
      // (entities, persistence adapters, módulos Nest) quedan fuera: la
      // estrategia elegida usa repositorios mockeados a nivel unit/integration.
      'src/modules/gestion-productos/presentacion/application/**/*.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/presentacion/domain/services/**/*.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/presentacion/dto/create-presentacion.dto.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/presentacion/dto/update-presentacion.dto.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/presentacion/mappers/presentacion.mapper.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/producto/utils/**/*.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/producto/mappers/**/*.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/producto/application/services/producto.service.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/superlinea/application/**/*.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/superlinea/domain/services/**/*.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/superlinea/dto/create-superlinea.dto.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/superlinea/dto/update-superlinea.dto.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/superlinea/mappers/superlinea.mapper.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      'src/modules/gestion-productos/linea/application/services/linea.service.ts': {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  };
  