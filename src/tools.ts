import { PiQueryOptions } from "./base/pi-database";
import { Logger } from 'sitka';
import { promisify } from 'util';

const
    _logger = Logger.getLogger('tools');

export function camel2column(field: string): string {
    return field.replace(/[A-Z]/g, g => '_' + g.toLowerCase());
}

export function column2camel(col: string, options: PiQueryOptions) {
    // If col includes '.' or it has a lowercase char, means it's already formatted by db
    if (!col.includes('.') && !/[a-z]/.test(col))
        col = col.toLowerCase();
    return options.map && options.map[col] ||
        col.replace(/_(\w)/g, (g, firstLetter) => firstLetter.toUpperCase());
}

export function promisifyAll(obj: any, methods: string[]): void {
    for (const method of methods) {
        obj[method] = promisify(obj[method]).bind(obj);
    }
}

export function jsonSetValue(obj: any, fieldPath: string, value: any, onlyUndefined: boolean = false) {
    const path = fieldPath.split('.');
    const len = path.length;
    for (let i = 0; i < len - 1; i++) {
        const attr = path[i];
        let next = obj[attr];
        if (!next) next = obj[attr] = {};
        obj = next;
    }
    const last = path[len - 1];
    if (!onlyUndefined || obj[last] === undefined)
        obj[last] = value;
}