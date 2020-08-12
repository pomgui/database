import { PiDatabasePool } from "../base/pi-pool";
import * as FB from 'node-firebird';
import { P } from "../tools";
import { PiDatabase } from "../base/pi-database";
import { PiFirebirdDatabase } from "./pi-firebird-database";

export class PiFirebirdPool implements PiDatabasePool {
    private _pool: FB.ConnectionPool;
    private _ID = 0;

    constructor(private _options: FB.Options,
        /* istanbul ignore next */
        poolCount = 4) {
        this._pool = FB.pool(poolCount, _options, null as any);
    }

    async get(): Promise<PiDatabase> {
        let db = await P(this._pool, 'get');
        if (!db._ID)
            db._ID = ++this._ID;
        return new PiFirebirdDatabase(db);
    }

    async openOrCreate(): Promise<PiFirebirdDatabase> {
        let db = await P(FB, 'attachOrCreate', this._options);
        db._ID = ++this._ID;
        return new PiFirebirdDatabase(db);
    }

}