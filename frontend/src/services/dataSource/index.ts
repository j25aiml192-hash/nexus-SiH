import type { IDataSource } from './IDataSource';
import { MockDataSource } from './mockDataSource';
import { ApiDataSource } from './apiDataSource';

export * from './IDataSource';
export * from './mockDataSource';
export * from './apiDataSource';

/**
 * Factory function injecting data source implementation based on environment flag
 * (VITE_DATA_SOURCE=mock | api)
 */
export function createDataSource(): IDataSource {
  const dataSourceMode = import.meta.env.VITE_DATA_SOURCE || 'mock';

  if (dataSourceMode === 'api') {
    return new ApiDataSource();
  }

  return new MockDataSource();
}

export const dataSource = createDataSource();
