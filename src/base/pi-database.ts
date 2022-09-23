import { column2camel, jsonSetValue } from '../tools';
import { PiError } from '../pi-error';
import { Logger, LogLevel } from 'sitka';

export type PiQueryOptions = {
    /** 
     * Normally all the columns will be converted to camel-case form. 
     * Ex: 'AUTO_UPDATE' will renamed to 'autoUpdate'.
     * This map can be used for exceptions to that rule. 
     * Ex: { 'employee_number': 'employeeId', ... }
     */
    map?: any;
    /** 
     * These column names in the query's result will be ignored 
     * and won't be part of the final recordset.
     */
    ignore?: string[];
};

type _PiRecords = Array<{ [colname: string]: any }>;

export interface QueryResult {
    affectedRows?: number;
    changedRows?: number;
    insertId?: number;
    rows?: _PiRecords;
}

export abstract class PiDatabase {
    protected _logger: Logger = null as any;
    protected _paramChar: '?' | '$' = '?'; // Char used as parameters

    get id(): number { return 0; }

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
        const ignored = new Set((options.ignore || []).map((i: string) => i.toLowerCase()));
        [sql, params] = this._parseNamedParams(sql, params);

        // Execute query
        const start = Date.now();
        let results: QueryResult;
        try {
            results = await this._executeQuery(sql, params as any);
        } catch (err) {
            this._logger.error(`SQL> `, err);
            throw err;
        } finally {
            this._logger.debug(`SQL> ${Date.now() - start}ms.`);
        }

        // Map rows
        let list = results && results.rows;
        if (list) {
            // datasets
            if (Array.isArray(list))
                list = list.map((r) => db2json(r, options));
            else
                // Single records (e.g. RETURNING INTO)
                list = [db2json(list, options)];
        }
        return list;

        function db2json(record: any, options: PiQueryOptions) {
            const result: any = {};
            for (const col in record) {
                if (ignored.has(col.toLowerCase()))
                    continue;
                jsonSetValue(result, column2camel(col, options), record[col]);
            }
            return result;
        }
    }

    protected abstract _executeQuery(sql: string, args: any[], returnField?: string): Promise<QueryResult>;

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
            });
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
    protected _parseNamedParams(sql: string, params: any): [string, any[]] {
        let realParams = params;
        const isArr = Array.isArray(params);
        const nullFields: string[] = [];
        sql = sql.trim();
        const useLiteral = /^execute\s+block/i.test(sql);
        let i = 1;
        const hasIndex = this._paramChar == '$';
        // Skip bulk inserts (array of arrays) or empty arrays
        if (params && (!isArr || params.length && !Array.isArray(params[0]))) {
            if (isArr)
                params = Object.assign({}, ...params);
            realParams = [];
            const name2index = new Map<string, string>();
            sql = sql.replace(/:([a-z_][\w.]*)/gi, (paramNameWColon, paramName) => {
                if (hasIndex && !useLiteral) {
                    const indexes = name2index.get(paramName);
                    if (indexes) return indexes;
                }
                let val = getValue(params, paramName);
                if (val === undefined) {
                    nullFields.push(paramNameWColon);
                    val = null;
                }
                // Literals MUST be used in execute block/procedure statements
                if (useLiteral) {
                    return this.escape(val);
                } else {
                    if (!Array.isArray(val))
                        val = [val];
                    realParams.push(...val);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const indexes = val.map((v: any) => this._paramChar + (hasIndex ? i++ : ''))
                        .join(',');
                    if(hasIndex)
                        name2index.set(paramName, indexes);
                    return indexes;
                }
            });
        }
        if ((this._logger as any)._level >= LogLevel.DEBUG) {
            let sqlLog = sql.replace(/\s+/g, ' ');
            if ((this._logger as any)._level >= LogLevel.TRACE) {
                this._logger.trace(`SQL> ${sqlLog}\nParams> ${JSON.stringify(realParams)}`);
            } else {
                let i = 0;
                if (this._paramChar == '$')
                    sqlLog = sqlLog.replace(/\$(\d+)/g, (g, p) =>
                        this.escape(realParams[parseInt(p) - 1]));
                else
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    sqlLog = sqlLog.replace(/\?/g, p =>
                        this.escape(realParams[i++]));
                this._logger.debug(`SQL> ${sqlLog}`);
            }
            if (nullFields.length)
                this._logger.warn(`WARN: SQL Parameters [${nullFields.join(',')}] not defined. Using null`);
        }
        return [sql, realParams];

        function getValue(obj: any, prop: string) {
            let val = obj;
            for (const p of prop.split('.'))
                val = val[p];
            return val;
        }
    }

}