/** Tipos genéricos do contrato HTTP compartilhados entre front e mock server. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ListResponse<T> {
  data: T[];
}

export interface ApiErrorBody {
  message: string;
  code?: string;
}
