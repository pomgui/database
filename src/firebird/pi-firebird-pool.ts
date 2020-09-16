import { PiDatabasePool } from "../base/pi-pool";
import { promisify } from "../tools";
import { PiDatabase } from "../base/pi-database";
import { PiFirebirdDatabase } from "./pi-firebird-database";

export class PiFirebirdPool implements PiDatabasePool {
    private _pool: any/*Firebird.ConnectionPool*/;
    private _ID = 0;

    /**
     * @param options require('node-firebird').Options
     * @param size Pool size
     */
    constructor(options: object, size = 10) {
        this._pool = require('node-firebird').pool(size, options);
        promisify(this._pool, ['get']);
    }

    async get(): Promise<PiDatabase> {
        let db = await this._pool.get();
        if (!db._ID)
            db._ID = ++this._ID;
        return new PiFirebirdDatabase(db);
    }
}