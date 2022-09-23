import { Logger } from 'sitka';
import { PiNoopDatabase } from '../../src/pi-no-database';

export class TestDatabase extends PiNoopDatabase {
    constructor() {
        super();
        this._logger = Logger.getLogger('test');
    }
    public _parseNamedParams(sql: string, params: any): [string, any[]] {
        return super._parseNamedParams(sql, params);
    }
}