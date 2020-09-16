import { PiQueryOptions } from "./base/pi-database";

export function camel2column(field: string): string {
    return field.replace(/[A-Z]/g, g => '_' + g.toLowerCase());
}

export function column2camel(col: string, options: PiQueryOptions) {
    // If col includes '.' means it's a object ex. 'a.b.c'
    if (!col.includes('.'))
        col = col.toLowerCase();
    return options.map && options.map[col] ||
        col.replace(/_(\w)/g, (g, firstLetter) => firstLetter.toUpperCase());
}

function promisifyMethod(method: Function, obj: any): Function {
    return function promisedMethod(...args: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            method.call(obj, ...args, (err: any, data: any) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    };
}

export function promisify(obj: any, methods: string[]): void {
    for (const method of methods) {
        const f = obj[method];
        obj[method] = promisifyMethod(f, obj);
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