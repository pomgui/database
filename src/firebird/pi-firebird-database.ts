import { PiDatabase, QueryResult, PiQueryType } from "../base/pi-database";
import * as FB from 'node-firebird';
import { P } from "../tools";
import { Logger } from "sitka";

interface FBDb extends FB.Database {
    _ID: number;
    currTransac?: FB.Transaction;
}

export class PiFirebirdDatabase extends PiDatabase {
    private _isOpen = true;

    get isOpen() { return this._isOpen; }

    /** @override */
    escape: (value: any) => string = FB.escape;

    constructor(private _db: FBDb) {
        super();
        this._logger = Logger.getLogger('FBdb#' + _db._ID);
    }

    async close(): Promise<void> {
        /* istanbul ignore else  */
        if (this._isOpen)
            return P(this._db, 'detach').then(() => { this._isOpen = false });
    }

    async beginTransaction(): Promise<void> {
        this._db.currTransac = await P(this._db, 'transaction');
    }

    commit(): Promise<void> {
        return P(this._db.currTransac, 'commit')
            .then(() => { this._logger.debug('committed'); delete this._db.currTransac });
    }

    rollback(): Promise<void> {
        if (this._db)
            return P(this._db.currTransac, 'rollback')
                .then(() => { this._logger.debug('rollback'); delete this._db.currTransac });
        else return Promise.reject('There\'s no database');
    }

    protected async _executeQuery(type: PiQueryType, sql: string, params: any[]): Promise<QueryResult> {
        sql = transformLimitToRows(sql);
        const result = await P(this._db.currTransac || this._db, 'query', sql, params);

        switch (type) {
            case PiQueryType.select:
                return { rows: result };
            case PiQueryType.insert:
            case PiQueryType.update:
            case PiQueryType.delete:
                return { affectedRows: 1 };
            default:
                return result &&
                    /* istanbul ignore next */
                    { rows: result };
        }
    }

};


/**
 * If the SQL contains {LIMIT offset,size} (mysql syntax), it will be converted to
 * {ROWS offset TO offset+size-1} (Firebird/SQL Standard)
 */
function transformLimitToRows(sql: string): string {
    return sql.replace(/LIMIT\s+(\d+)\s*,\s*(\d+)/gi, (g, offset, size) =>
        'ROWS ' + ((offset >> 0) + 1) + ' TO ' + ((offset >> 0) + (size >> 0))
    )
}