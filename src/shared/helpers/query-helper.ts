import { FindOptionsOrder } from 'typeorm';

export function parseSort(
  data: string,
  convertToSnakeCase = false,
  tableAlias?: string,
): FindOptionsOrder<any> {
  if (!data) {
    return {};
  }

  const sortConditions = data.split(' ');

  return sortConditions.reduce((agg: FindOptionsOrder<any>, data: string) => {
    const isDescending = data[0] === '-';
    if (isDescending) {
      let columnName = data.slice(1, data.length);

      if (convertToSnakeCase) {
        columnName = columnName.replace(/([A-Z])/g, '_$1').toLowerCase();
      }
      if (tableAlias) {
        columnName = `${tableAlias}.${columnName}`;
      }
      agg[columnName] = 'DESC';
    } else {
      agg[data] = 'ASC';
    }

    return agg;
  }, {} as FindOptionsOrder<any>);
}

export function parseSortMongo(data: string) {
  if (!data) {
    return {};
  }

  const sortConditions = data.split(' ');

  return sortConditions.reduce((agg, data: string) => {
    const isDescending = data[0] === '-';
    if (isDescending) {
      const columnName = data.slice(1, data.length);

      agg[columnName] = -1;
    } else {
      agg[data] = 1;
    }

    return agg;
  }, {} as Record<string, number>);
}
