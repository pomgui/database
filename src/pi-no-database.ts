import { PiDatabase, QueryResult, PiQueryType } from './base/pi-database';

export class PiNoopDatabase extends PiDatabase {
    async open(): Promise<void> { }
    escape(value: any): string { return value; }
    async beginTransaction(): Promise<void> { }
    async commit(): Promise<void> { }
    async rollback(): Promise<void> { }
    async close(): Promise<void> { }
    protected async _executeQuery(type: PiQueryType, sql: string, params: any[]): Promise<QueryResult> {
        return { affectedRows: 0, insertId: 0, rows: [] };
    }
};
