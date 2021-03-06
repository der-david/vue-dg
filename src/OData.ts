import { IDataRequest, FilterOperator, operatorOrDefault, SortDirection, IUrlSet, IDataPage, IFieldInfo } from "./DataSource";
import { formatDate } from "./DateFormat";

function findFilter(operator: FilterOperator) {
   if(operator === FilterOperator.Equals)
      return "eq";
   if(operator === FilterOperator.GraterThanOrEqual)
      return "ge";
   if(operator === FilterOperator.GreaterThan)
      return "gt";
   if(operator === FilterOperator.LowerThan)
      return "lt";
   if(operator === FilterOperator.LowerThanOrEqual)
      return "le";
   throw {message: `Unknown odata filter type: ${operator}` };
}

function mapDirection(direction: SortDirection) {
   if(direction === SortDirection.Asc)
      return "asc";
   if(direction === SortDirection.Desc)
      return "desc";
   throw {message: `Unknown odata sort direction: ${direction}` };
}

export function mapData(version: ODataVersion, result: any): IDataPage {
   const paramName = version === ODataVersion.Version3
      ? "odata.count"
      : "@odata.count";

   return {
      items: result.value,
      total: parseInt(result[paramName], 10)
   };
}

interface IArgs {
   vars: Array<{name: string, value: string | null }>;
}

export enum ODataVersion {
   Version3 = 3,
   Version4 = 4
}

function formatValueV3(fieldInfo: IFieldInfo | undefined, value: any) {
   if(value instanceof Date)
      return `DateTime'${formatDate(value, "YYYY-MM-DDTHH:mm:ss")}'`;
   if(typeof value === "boolean")
      return value ? "true" : "false";
   if(typeof value !== "number")
      return `'${value}'`;
   if(fieldInfo && fieldInfo.dataType === "decimal")
      return value+"m";
   return value;
}

function formatValueV4(fieldInfo: IFieldInfo | undefined, value: any) {
   if(value instanceof Date)
      return `${formatDate(value, "YYYY-MM-DDTHH:mm:ssz")}`;
   if(typeof value === "boolean")
      return value ? "true" : "false";
   if(typeof value !== "number")
      return `'${value}'`;
   if(fieldInfo && fieldInfo.dataType === "decimal")
      return value+"m";
   return value;
}

export function buildUrl(version: ODataVersion, url: string, request: IDataRequest): IUrlSet {
   const filterGroups = request.filters.map(group => group.filters.map((filter): string | null => {
      const operator = operatorOrDefault(filter.operator);
      const fieldInfo = request.fields.find(i => i.field === filter.field);

      const formatValue = version === ODataVersion.Version3
         ? formatValueV3
         : formatValueV4;

      if(operator === FilterOperator.NotEqals)
         return `not(${filter.field} eq ${formatValue(fieldInfo, filter.value)})`;
      if(operator === FilterOperator.Contains)
         return version === ODataVersion.Version3
            ?  `substringof(${formatValue(fieldInfo, filter.value)}, ${filter.field})`
            :  `contains(${filter.field}, ${formatValue(fieldInfo, filter.value)})`;
      if(operator === FilterOperator.StartsWith)
         return `startswith(${filter.field}, ${formatValue(fieldInfo, filter.value)})`;
      if(operator === FilterOperator.EndsWith)
         return `endswith(${filter.field}, ${formatValue(fieldInfo, filter.value)})`;
      if(operator === FilterOperator.In) {
         if(!filter.value || filter.value.length === 0)
            return null;
         const clauses = filter.value.map((i: any) => `(${filter.field} eq ${formatValue(fieldInfo, i)})`).join(" or ");
         return filter.value.length > 1 ? `(${clauses})` : clauses;
      }
      return `${filter.field} ${findFilter(operator)} ${formatValue(fieldInfo, filter.value)}`;
   }).filter(i => !!i).join(" and "));

   const filters = filterGroups.length > 1
      ? filterGroups.map(i => `(${i})`).join(" and ")
      : filterGroups.length > 0 ? filterGroups[0] : null;

   const sort = request.sorting.length > 0
      ? request.sorting.map(i => `${i.field} ${mapDirection(i.direction)}`).join(", ")
      : null;

   const customVars = (() => {
      if(!request.args)
         return [];
      const typed = request.args as IArgs;
      if(!Array.isArray(typed.vars))
         return [];
      return typed.vars;
   })();
   const vars = [
      {name: "$filter", value: filters },
      {name: "$orderby", value: sort },
      ...customVars
   ].filter(i => i.value !== null).map(i => `${i.name}=${i.value}`).join("&");

   const dataUrl = `${url}?${vars}`;
   const joinSymbol = vars ? "&" : "";
   const countParam = version === ODataVersion.Version3
      ? {name: "$inlinecount", value: "allpages" }
      : {name: "$count", value: "true" };

   const pageVars = [
      {name: "$top", value: request.pageSize },
      {name: "$skip", value: request.pageSize !== null && request.page !== null ? request.page * request.pageSize : null },
      countParam
   ].filter(i => i.value !== null).map(i => `${i.name}=${i.value}`).join("&");

   return {
      dataUrl,
      pageUrl: `${dataUrl}${joinSymbol}${pageVars}`
   };
}
