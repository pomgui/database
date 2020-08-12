import { PiDatabasePool } from "../base/pi-pool";
import { PiDatabase } from "../base/pi-database";
import * as mysql from "mysql";
import { PiMySqlDatabase } from "./pi-mysql-database";
import { P } from '../tools'

export class PiMySqlPool implements PiDatabasePool {
    private _pool: mysql.Pool;
    private _ID = 0;

    constructor(private _options: mysql.PoolConfig,
        /* istanbul ignore next */
        poolCount = 4) {
        this._options = Object.assign({ connectionLimit: poolCount }, _options);
        this._pool = mysql.createPool(this._options);
    }

    async get(): Promise<PiDatabase> {
        let db = await P(this._pool, 'getConnection');
        if (!db._ID)
            db._ID = ++this._ID;
        return new PiMySqlDatabase(db);
    }

}