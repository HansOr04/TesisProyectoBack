import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 200;
/** Tope de filas cuando el cliente no pagina (compatibilidad con listados clásicos). */
export const MAX_UNPAGED_ROWS = 500;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit = 50;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Argumentos Prisma (`skip`/`take`) para una consulta paginada o acotada. */
export function pageArgs(query: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  if (!query.page) return { skip: 0, take: MAX_UNPAGED_ROWS };
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

/**
 * Devuelve el sobre paginado cuando el cliente pidió `page`; si no, la lista
 * plana (acotada) para no romper a los consumidores que esperan un array.
 */
export function pageResult<T>(
  query: PaginationQueryDto,
  items: T[],
  total: number,
): Paginated<T> | T[] {
  if (!query.page) return items;
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(total / query.limit)),
  };
}
