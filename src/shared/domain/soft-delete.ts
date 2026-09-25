// Convención transversal: los registros se "borran" fijando deletedAt.
// Todas las consultas de lectura filtran deletedAt: null explícitamente
// (no hay middleware global de soft-delete como en el sistema de origen).
export const NOT_DELETED = { deletedAt: null } as const;
