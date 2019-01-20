import { chain } from './linq';

//promises by hand - for better compatibility ane less dependencies

export enum FilterOperator {
   Equals = "eq",
   GreaterThan = "gt",
   GraterThanOrEqual = "gte",
   LowerThan = "lt",
   LowerThanOrEqual = "lte",
   NotEqals = "neq",
   In = "in"
}

export interface IColumnFilter {
   field: string;
   groups: IFilterGroup[];
}

export interface IFilterValue {
   value: any;
   operator: FilterOperator;
   field: string;
}

export interface IFilterGroup {
   filters: IFilterValue[];
}

export enum SortDirection {
   Asc = "asc",
   Desc = "desc"
}

export interface ISortField {
   field: string;
   direction: SortDirection;
}

export interface IDataRequest {
   page: number;
   pageSize: number;
   sorting: ISortField[];
   filters: IFilterGroup[];
}

export class DataPromise {

   private onSuccess: (data: any[], total: number) => void = () => {};
   private onError: (error?: any) => void = () => {};
   private onAlways: () => void = () => {};
   private resolver: (onSuccess: (data: any[], total: number) => void, onError: (error?: any) => void, onAlways: () => void) => void;

   public constructor(resolver: (onSuccess: (data: any[], total: number) => void, onError: (error?: any) => void, onAlways: () => void) => void) {
      this.resolver = resolver;
   }

   public success(callback: (data: any[], total: number) => void) {
      this.onSuccess = callback;
      return this;
   }

   public error(callback: (error?: any) => void) {
      this.onError = callback;
      return this;
   }

   public always(callback: () => void) {
      this.onAlways = callback;
      return this;
   }

   public fetch() {
      this.resolver(this.onSuccess, this.onError, this.onAlways);
   }
}

export interface IDataSource {
   load: (request: IDataRequest) => DataPromise;
   name: string;
}

export default function(source: any, sourceOptions: any) {
   if(!source)
      return emptySource();

   if(typeof source === "string") {
      if(sourceOptions === "odata")
         return odataSource(source);
      throw { error: "Source options must be set to odata (other options to be implemented)." };
   }
   if(Array.isArray(source)) {
      return arraySource(source);
   }

   throw { error: "Not supported data type passed as source for grid. Expected string url or array of objects." };
}

function emptySource(): IDataSource {
   return {
      name: "empty",
      load() {
         return new DataPromise((onSuccess, _, onAlways) => {
            onSuccess([], 0);
            onAlways();
         });
      }
   };
}

function odataSource(url: string): IDataSource {
   return {
      name: "odata",
      load(data) {
         return new DataPromise((onSuccess, onError) => {
            //todo
         });
      }
   };
}

function isRowMatching(row: any, filter: IFilterValue) {
   const value = row[filter.field];
   if(filter.operator === FilterOperator.Equals)
      return value === filter.value;
   if(filter.operator === FilterOperator.NotEqals)
      return value !== filter.value;
   if(filter.operator === FilterOperator.GraterThanOrEqual)
      return value >= filter.value;
   if(filter.operator === FilterOperator.GreaterThan)
      return value > filter.value;
   if(filter.operator === FilterOperator.LowerThan)
      return value < filter.value;
   if(filter.operator === FilterOperator.LowerThanOrEqual)
      return value <= filter.value;
   if(filter.operator === FilterOperator.In)
      return filter.value && filter.value.length > 0 && chain(filter.value as any[]).any(i => i === value);
   throw {message: `Unknown filter type: ${filter.operator}` };
}

function arraySource(values: any[]): IDataSource {
   return {
      name: "array",
      load(data) {
         return new DataPromise((onSuccess, _, onAlways) => {
            const isMatching = (row: any) => chain(data.filters)
               .all(group => chain(group.filters).any(filter => isRowMatching(row, filter)));

            const copy = data.filters.length > 0
               ? chain(values).where(isMatching).toList()
               : values.slice();

            if(data.sorting.length > 0)
               copy.sort((a, b) => {
                  for(const entry of data.sorting) {
                     if(a[entry.field] === b[entry.field])
                        continue;
                     let isLower = a[entry.field] < b[entry.field];
                     if(entry.direction === "desc")
                        isLower = !isLower;
                     return isLower ? -1 : 1;
                  }
                  return 0;
               });

            const result = copy.slice(data.page*data.pageSize, (data.page+1)*data.pageSize);
            onSuccess(result, copy.length);
            onAlways();
         });
      }
   };
}