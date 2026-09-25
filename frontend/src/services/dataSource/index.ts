import type { IDataSource } from './IDataSource';
import { ApiDataSource } from './apiDataSource';

export * from './IDataSource';
export * from './apiDataSource';

/**
 * NEXUS Live API Data Source
 * Direct connection to FastAPI backend & database.
 */
export function createDataSource(): IDataSource {
  return new ApiDataSource();
}

export const dataSource: IDataSource = createDataSource();
