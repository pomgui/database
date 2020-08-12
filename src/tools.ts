import { PiQueryOptions } from "./base/pi-database";

export function camel2column(field: string): string {
    return field.replace(/[A-Z]/g, g => '_' + g.toLowerCase());
}

export function column2camel(col: string, options: PiQueryOptions) {
    col = col.toLowerCase();
    return options.map && options.map[col] ||
        col.replace(/_(\w)/g, (g, firstLetter) => firstLetter.toUpperCase());
}

export function P(obj: any, meth: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const f = obj[meth];
        f.call(obj, ...args, function (err: any, data: any) {
            if (err) reject(err);
            else resolve(data);
        });
    });
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