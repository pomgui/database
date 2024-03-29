/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { PiDatabase, QueryResult } from './base/pi-database';

export class PiNoopDatabase extends PiDatabase {
    escape(value: any): string { return value; }
    async beginTransaction(): Promise<void> { }
    async commit(): Promise<void> { }
    async rollback(): Promise<void> { }
    async close(): Promise<void> { }
    protected async _executeQuery(sql: string, params: any[]): Promise<QueryResult> {
        return { affectedRows: 0, insertId: 0, rows: [] };
    }
}
