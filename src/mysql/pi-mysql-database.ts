import * as mysql from "mysql";
import { PiDatabase, QueryResult, PiQueryType } from "../base/pi-database";
import { P } from "../tools";
import { Logger } from "sitka";

export class PiMySqlDatabase extends PiDatabase {
    private _isOpen = true;
    escape: (value: any) => string = null as any;

    constructor(private _db: mysql.Connection) {
        super();
        this.escape = _db.escape;
        this._logger = Logger.getLogger({
            name: 'Mysql#' + ((_db as any)._ID || 0),
            format: Logger.Format.TEXT_NO_TIME
        });
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof (this._db as any)._ID == 'number') {
                (this._db as mysql.PoolConnection).release();
                resolve();
            } else {
                this._db.end(err => err ? reject(err) : resolve());
            }
        });
    }

    beginTransaction(): Promise<void> {
        return P(this._db, 'beginTransaction');
    }

    commit(): Promise<void> {
        return P(this._db, 'commit')
            .then(() => this._logger.debug('committed'));
    }

    rollback(): Promise<void> {
        return P(this._db, 'rollback')
            .then(() => this._logger.debug('rollback'));
    }

    protected async _executeQuery(type: PiQueryType, sql: string, params: any[]): Promise<QueryResult> {
        let result: any = await P(this._db, 'query', sql, params);
        if (result[1] && "affectedRows" in result[1])
            // work around when it's a CALL and not a SELECT
            result = result[0];
        return {
            affectedRows: result.affectedRows,
            insertId: result.insertId,
            changedRows: result.changedRows,
            rows: result
        };
    }

};