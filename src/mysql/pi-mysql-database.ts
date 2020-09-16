import { PiDatabase, QueryResult, PiQueryType } from "../base/pi-database";
import { Logger } from "sitka";
import { promisify } from '../tools';

export class PiMySqlDatabase extends PiDatabase {
    private _isOpen = true;
    escape: (value: any) => string = null as any;

    constructor(private _db: any /*mysql.Connection*/) {
        super();
        this.escape = _db.escape;
        this._logger = Logger.getLogger('Mysql#' + ((_db as any)._ID || 0));
        promisify(this._db, ['beginTransaction', 'commit', 'rollback', 'query', 'end'])
    }

    close(): Promise<void> {
        if (typeof (this._db as any)._ID != 'number')
            return this._db.end();
        else
            return new Promise(resolve => {
                this._db.release();
                resolve();
            });
    }

    beginTransaction(): Promise<void> {
        return this._db.beginTransaction();
    }

    commit(): Promise<void> {
        return this._db.commit()
            .then(() => this._logger.debug('committed'));
    }

    rollback(): Promise<void> {
        return this._db.rollback()
            .then(() => this._logger.debug('rollback'));
    }

    protected async _executeQuery(type: PiQueryType, sql: string, params: any[]): Promise<QueryResult> {
        let result: any = await this._db.query(sql, params);
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