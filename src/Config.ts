import { VNode, CreateElement } from 'vue';
import { formatDate } from "./DateFormat";
import { formatNumber } from "./NumberFormat";
import { INumericFilterParams } from "./components/NumericFilter";

interface ITypeConfig {
   name: string;
   formatter?: (value: any, options: any, h: CreateElement) => string | VNode;
   filterComponent?: string;
   filterParams: any;
}

export interface ILang {
   yes: string;
   no: string;
   pagerPage: string;
   pagerOfPages: string;
   firstPage: string;
   previousPage: string;
   nextPage: string;
   lastPage: string;
   pageListItemTitle: string;
   filterAccept: string;
   filterReset: string;
   dropdownLabel: string;
   rangeFrom: string;
   rangeTo: string;
   containsValue: string;
   valueEquals: string;
}

const types: {[key: string]: ITypeConfig } = {};
let i18n: ILang = {
   yes: "Yes",
   no: "No",
   pagerPage: "Page",
   pagerOfPages: "of",
   firstPage: "First page",
   previousPage: "Previous page",
   nextPage: "Next page",
   lastPage: "Last page",
   pageListItemTitle: "Page %page%",
   filterAccept: "Accept",
   filterReset: "Reset",
   dropdownLabel: "Select...",
   rangeFrom: "From:",
   rangeTo: "To:",
   containsValue: "Contains:",
   valueEquals: "Equals:"
};

export interface ICalendar {
   dateFormat: string;
   datePlaceholder: string;
   dateTimeFormat: string;
   dateTimePlaceholder: string;
   timeFormat: string;
   timePlaceholder: string;
   weekStart: number;
   dayNames: string[];
   monthNamesFull: string[];
   monthNamesShort: string[];
   yearFormat: string;
   yearRangeFormat: string;
   monthFormat: string;
   monthFirst: boolean;
}

const calendarSettings: ICalendar = {
   dateFormat: "YYYY-MM-DD",
   datePlaceholder: "yyyy-mm-dd",
   timeFormat: "HH:mm",
   timePlaceholder: "hh:mm",
   dateTimeFormat: "YYYY-MM-DD HH:mm",
   dateTimePlaceholder: "yyyy-mm-dd hh:mm",
   dayNames: [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
   ],
   monthNamesFull: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
   monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
   weekStart: 1,
   yearFormat: "{year}",
   yearRangeFormat: "{from} - {to}",
   monthFormat: "{month}",
   monthFirst: true
};

export interface ILocale {
   calendar: ICalendar;
   settings: ISettingsArgs;
   text: ILang;
}

export function setLocale(locale: ILocale) {
   setSettings(locale.settings);
   setCalendar(locale.calendar);
   setLanguage(locale.text);
}

export function getCalendar() {
   return calendarSettings;
}

export function setCalendar(calendar: any | ICalendar) {
   const target = calendarSettings as any;
   for(const prop of Object.getOwnPropertyNames(calendar)) {
      if(target[prop] !== undefined)
         target[prop] = calendar[prop];
   }
}

export interface ISettings {
   idField: string;
   thousandSeparator: string;
   decimalPrecision: number;
   decimalSeparator: string;
}

export interface ISettingsArgs {
   idField?: string;
   thousandSeparator?: string;
   decimalPrecision?: number;
   decimalSeparator?: string;
}

const settings: ISettings = {
   idField: "id",
   thousandSeparator: " ",
   decimalPrecision: 2,
   decimalSeparator: "."
};

export function setSettings(values: any | ISettingsArgs) {
   const target = settings as any;
   for(const prop of Object.getOwnPropertyNames(values)) {
      if(target[prop] !== undefined)
         target[prop] = values[prop];
   }
}

export function getSettings() {
   return settings;
}

export function setLanguage(lang: ILang) {
   i18n = lang;
}

export interface ITypeDefinition {
   formatter?: (value: any, options: any, h: CreateElement) => string | VNode;
   filterComponent?: string;
   filterParams?: any;
}

export function addType(name: string, definition: ITypeDefinition) {
   types[name] = {
      name,
      formatter: definition.formatter,
      filterComponent: definition.filterComponent,
      filterParams: definition.filterParams
   };
}

export function getFormatter(typeName: string | undefined | null): (value: any, options: any, h: CreateElement) => string | VNode {
   function defaultFormatter(value: any) {
      return value !== undefined || value !== null ? ""+value : "";
   }
   if(!typeName || !types[typeName])
      return defaultFormatter;
   const candidate = types[typeName].formatter;
   return candidate ? candidate : defaultFormatter;
}

export function getFilterComponent(typeName: string | undefined | null) {
   if(!typeName || !types[typeName])
      return null;
   const candidate = types[typeName];
   return candidate && candidate.filterComponent 
      ? { component: candidate.filterComponent, params: candidate.filterParams } 
      : null;
}

type LangKey = keyof ILang;
export function localize(key: LangKey) {
   return i18n[key];
}

export function setFilterComponent(typeName: string, filterComponent: string) {
   const entry = types[typeName];
   if(entry)
      entry.filterComponent = filterComponent;
}

addType("bool", {
   formatter: value => {
      if(value === undefined || value === null)
         return "";
      return !!value ? i18n.yes : i18n.no;
   },
   filterComponent: "BoolFilter"
});

addType("date", {
   formatter: (value, options) => {
      if(!value)
         return "";
      const date = value instanceof Date
         ? value
         : new Date(value);
      return formatDate(date, typeof options === "string" ? options : calendarSettings.dateFormat);
   },
   filterComponent: "DateFilter"
});

function decimalFormatter(value: any, options: any) {
   if(value === 0)
      return "0";
   if(!value)
      return "";
   if(!options)
      return formatNumber(value, settings.decimalPrecision, settings.thousandSeparator, settings.decimalSeparator);

   return formatNumber(value,
      options.precision !== undefined ? options.precision : settings.decimalPrecision,
      options.thousand !== undefined ? options.thousand : settings.thousandSeparator,
      options.separator !== undefined ? options.separator : settings.decimalSeparator);
}

addType("decimal", {
   formatter: decimalFormatter,
   filterComponent: "NumericFilter",
   filterParams: { decimal: true } as INumericFilterParams,
});

addType("double", {
   formatter: decimalFormatter,
   filterComponent: "NumericFilter",
   filterParams: { decimal: true } as INumericFilterParams,
});

addType("text", {
   filterComponent: "TextFilter"
});

addType("int", {
   formatter: (value, options) => {
      if(value === 0)
         return "0";
      if(!value)
         return "";
      if(!options)
         return formatNumber(value, 0, settings.thousandSeparator, settings.decimalSeparator);

      return formatNumber(value,
         0,
         options.thousand !== undefined ? options.thousand : settings.thousandSeparator,
         options.separator !== undefined ? options.separator : settings.decimalSeparator);
   },
   filterComponent: "NumericFilter",
   filterParams: { decimal: false } as INumericFilterParams,
});

addType("dateTime", {
   formatter: (value, options) => {
      if(!value)
         return "";
      const date = value instanceof Date
         ? value
         : new Date(value);
      return formatDate(date, typeof options === "string" ? options : calendarSettings.dateTimeFormat);
   },
   filterComponent: "DateTimeFilter"
});