import { PiDatabase, QueryResult, PiQueryType } from "../base/pi-database";
import { promisify } from "../tools";
import { Logger } from "sitka";

export class PiFirebirdDatabase extends PiDatabase {
    private _isOpen = true;
    private _currTransac: any;

    get isOpen() { return this._isOpen; }

    constructor(private _db: any /* Firebird.Database */) {
        super();
        promisify(_db, ['detach', 'transaction', 'query']);
        this._logger = Logger.getLogger('FBdb#' + _db._ID);
    }

    /** @override */
    escape(value: any): string {
        if (Array.isArray(value)) {
            return value.map(item => this.escape(item)).join(',');
        } else
            return this._db.escape(value);
    }

    async close(): Promise<void> {
        /* istanbul ignore else  */
        if (this._isOpen)
            return this._db.detach().then(() => { this._isOpen = false });
    }

    async beginTransaction(): Promise<void> {
        this._currTransac = await this._db.transaction();
        promisify(this._currTransac, ['commit', 'rollback', 'query']);
    }

    commit(): Promise<void> {
        return this._currTransac.commit()
            .then(() => { this._logger.debug('committed'); delete this._currTransac });
    }

    rollback(): Promise<void> {
        if (this._db)
            return this._currTransac.rollback()
                .then(() => { this._logger.debug('rollback'); delete this._currTransac });
        else
            return Promise.reject('There\'s no database');
    }

    protected async _executeQuery(type: PiQueryType, sql: string, params: any[]): Promise<QueryResult> {
        sql = transformLimitToRows(sql);
        const obj = this._currTransac || this._db;
        const result = await obj.query(sql, params);

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