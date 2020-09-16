import { PiDatabase, QueryResult, PiQueryType } from "../base/pi-database";
import { promisifyAll } from "../tools";
import { Logger } from "sitka";

export class PiFirebirdDatabase extends PiDatabase {
    private _currTransac: any;

    constructor(private _db: any /* Firebird.Database */) {
        super();
        promisifyAll(this._db, ['detach', 'transaction', 'query']);
        this._logger = Logger.getLogger('DB#' + this.id);
    }

    get id(): number { return this._db._ID; }

    /** @override */
    escape(value: any): string {
        if (Array.isArray(value)) {
            return value.map(item => this.escape(item)).join(',');
        } else
            return this._db.escape(value);
    }

    async close(): Promise<void> {
        /* istanbul ignore else  */
        if (this._db.connection._isOpened)
            return this._db.detach();
    }

    beginTransaction(): Promise<void> {
        return this._db.transaction(null)
            .then((t: any) => {
                promisifyAll(this._currTransac = t, ['commit', 'rollback', 'query']);
            });
    }

    commit(): Promise<void> {
        return this._currTransac.commit()
            .then(() => {
                this._logger.debug('committed');
                delete this._currTransac;
            });
    }

    rollback(): Promise<void> {
        if (this._currTransac)
            return this._currTransac.rollback()
                .then(() => {
                    this._logger.debug('rollback');
                    delete this._currTransac;
                });
        else
            return Promise.reject('No transaction to rollback');
    }

    protected _executeQuery(type: PiQueryType, sql: string, params: any[]): Promise<QueryResult> {
        sql = transformLimitToRows(sql);
        const dbObj = this._currTransac || this._db;
        return dbObj.query(sql, params)
            .then((result: any) => {
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
            });
    }
}

/**
 * If the SQL contains {LIMIT offset,size} (mysql syntax), it will be converted to
 * {ROWS offset TO offset+size-1} (Firebird/SQL Standard)
 */
function transformLimitToRows(sql: string): string {
    return sql.replace(/LIMIT\s+(\d+)\s*,\s*(\d+)/gi, (g, offset, size) =>
        'ROWS ' + ((offset >> 0) + 1) + ' TO ' + ((offset >> 0) + (size >> 0))
    )
}
