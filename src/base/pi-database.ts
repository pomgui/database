import { column2camel, jsonSetValue } from "../tools";
import { PiError } from "../pi-error";
import { Logger } from 'sitka';

export type PiQueryOptions = {
    // Normally all the columns will be converted to camel-case form. Ex: 'AUTO_UPDATE' will renamed to 'autoUpdate'.
    // This map can be used for exceptions to that rule. Ex: { 'employee_number': 'employeeId', ... }
    map?: any;
    // These column names in the query's result will be ignored and won't be part of the final recordset
    ignore?: string[];
}

export enum PiQueryType { select, insert, update, delete, any };
export const PiQueryTypeStr = ['select', 'insert', 'update', 'delete', 'any query'];

type _PiRecords = Array<{ [colname: string]: any }>;

export interface QueryResult {
    affectedRows?: number;
    changedRows?: number;
    insertId?: number;
    rows?: _PiRecords;
}

export abstract class PiDatabase {
    protected _logger: Logger = null as any;

    /**
     * Starts a new transaction that will be finished with a commit or rollback.
     * Only one transaction is allowed per connection in order to be able to 
     * work with mysql and firebird drivers.
     */
    abstract beginTransaction(): Promise<void>;
    abstract commit(): Promise<void>;
    abstract rollback(): Promise<void>;

    /**
     * Executes a query instruction and returns the result or results converting all the column names to 
     * camel-case format 
     * @see Options
     * @param sql 
     * @param params 
     * @param options 
     */
    async query(sql: string, params: object, options: PiQueryOptions = {}): Promise<any> {
        let ignored = new Set((options.ignore || []).map((i: string) => i.toLowerCase()));
        [sql, params] = this._parseNamedParams(sql, params);

        // Execute query
        const start = Date.now();
        let results: QueryResult;
        try {
            results = await this._executeQuery(PiQueryType.select, sql, params as any);
            this._logger.trace(`SQL> ${Date.now() - start}ms.`);
        } catch (err) {
            this._logger.error(`SQL> ERR:`, err);
            throw err;
        }

        // Map rows
        let list = results.rows
            && results.rows.map((r: any) => db2json(r, options));
        return list;

        function db2json(record: any, options: PiQueryOptions) {
            let result: any = {};
            for (let col in record) {
                if (ignored.has(col.toLowerCase()))
                    continue;
                jsonSetValue(result, column2camel(col, options), record[col]);
            }
            return result;
        }
    }

    protected abstract _executeQuery(type: PiQueryType, sql: string, args: any[], returnField?: string): Promise<QueryResult>;

    /**
     * Same as query(), but oriented to return one single record. If the record is not found it shall throw
     * an error 404
     * @param sql 
     * @param params 
     * @param options 
     */
    querySingle(sql: string, params: object, options?: PiQueryOptions): Promise<any> {
        return this.query(sql, params, options)
            .then(list => {
                if (!list.length)
                    throw PiError.status(404, 'Not found');
                if (list.length != 1)
                    throw PiError.status(406, 'Too many rows');
                return list[0];
            })
    }

    /**
     * Executes an insert instruction and returns the ID or IDs of the new inserted records.
     * @param sql 
     * @param params 
     */
    async insert(sql: string, params?: any, returnField?: string): Promise<any | any[]> {
        _assertSql('insert', sql, PiQueryType.insert);
        [sql, params] = this._parseNamedParams(sql, params);
        const results: QueryResult = await this._executeQuery(PiQueryType.insert, sql, params, returnField);
        if (results.affectedRows == 1)
            return results.insertId;
        else {
            let ids = new Array(results.affectedRows).fill(0)
                .map((dummy, i) => (results.insertId || 0) + i);
            return ids;
        }
    }

    /**
     * Executes an update instruction and returns the number of records affected
     * @param sql 
     * @param params 
     */
    async update(sql: string, params?: any): Promise<any> {
        _assertSql('update', sql, PiQueryType.update);
        [sql, params] = this._parseNamedParams(sql, params);
        const results: QueryResult = await this._executeQuery(PiQueryType.update, sql, params);
        return results.affectedRows;
    }

    /**
     * Executes a delete instruction and returns the number of records affected
     * @param sql 
     * @param params 
     */
    async delete(sql: string, params?: any): Promise<any> {
        _assertSql('delete', sql, PiQueryType.delete);
        [sql, params] = this._parseNamedParams(sql, params);
        const results: QueryResult = await this._executeQuery(PiQueryType.delete, sql, params);
        return results.affectedRows;
    }

    /**
     * Closes the connection to the database
     */
    abstract close(): Promise<void>;

    /**
     * Escapes a string to be safely used in a query (avoiding sql injection)
     * @param value 
     */
    abstract escape(value: any): string;

    /** Allows named parameters */
    protected _parseNamedParams(sql: string, params: any): [string, any] {
        let realParams = params;
        const isArr = Array.isArray(params);
        sql = sql.trim();
        // Skip bulk inserts (array of arrays) or empty arrays
        if (params && (!isArr || params.length && !Array.isArray(params[0]))) {
            if (isArr)
                params = Object.assign({}, ...params);
            realParams = [];
            sql = sql.replace(/:([a-z_][\w.]*)/gi, (paramNameWColon, paramName) => {
                let val = getValue(params, paramName);
                if (val === undefined) {
                    this._logger.warn(`WARN: SQL Parameter '${paramNameWColon}' not defined. Using null`);
                    val = null;
                }
                if (!Array.isArray(val))
                    val = [val];
                realParams.push(...val);
                return val.map((v: any) => '?').join(',');
            });
        }
        this._logger.trace(`SQL> ${sql.replace(/\s+/g, ' ')}. Params:`, realParams);
        return [sql, realParams];

        function getValue(obj: any, prop: string) {
            let val = obj;
            for (let p of prop.split('.'))
                val = val[p];
            return val;
        }
    }

};

function _assertSql(method: string, sql: string, type: PiQueryType): void {
    if (process.env.NODE_ENV == 'production' || type == PiQueryType.any) return;
    const expected = PiQueryTypeStr[type];
    if (!new RegExp(`^\\s*${expected}`, 'i').test(sql))
        throw new Error(`PiDatabase.${method}: Only "${expected}" sentence supported.`);
}