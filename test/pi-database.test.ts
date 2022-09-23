import { Logger, LogLevel } from 'sitka';
import { TestDatabase } from './helpers/TestDatabase';

describe(`pi-database`, () => {
    let db: TestDatabase;
    beforeEach(() => {
        db = new TestDatabase();
    });

    describe(`_parseNamedParams with '$' param prefix`, () => {
        beforeEach(() => {
            (db as any)._paramChar = '$';
        });

        test(`Simple replacement`, () => {
            const [sql, params] = db._parseNamedParams(`select 1 from table where one = :one and two = :two`, { one: 1, two: '2' });
            expect(sql).toBe(`select 1 from table where one = $1 and two = $2`);
            expect(params).toStrictEqual([1, '2']);
        });

        test(`Multiple reference`, () => {
            const [sql, params] = db._parseNamedParams(`
                select 1 from table where one = :one and two = :two and other = :one
            `, { one: 1, two: '2' });
            expect(sql).toBe(`select 1 from table where one = $1 and two = $2 and other = $1`);
            expect(params).toStrictEqual([1, '2']);
        });

        test(`Multiple reference with arrays`, () => {
            const [sql, params] = db._parseNamedParams(`
                select 1 from table 
                where one = :one and two = :two 
                and other in (:arr)
                and field2 not in (:arr)
            `, { one: 1, two: '2', arr: [10, 20, 30, 40, 50] });
            expect(sql.replace(/\s+/g, ' ')).toBe(`select 1 from table ` +
                'where one = $1 and two = $2 ' +
                'and other in ($3,$4,$5,$6,$7) ' +
                'and field2 not in ($3,$4,$5,$6,$7)');
            expect(params).toStrictEqual([1, '2', 10, 20, 30, 40, 50]);
        });

        test(`Using escape`, () => {
            (db as any)._logger = Logger.getLogger({ level: LogLevel.DEBUG });
            const logger = (db as any)._logger as Logger;
            jest.spyOn(logger, 'debug');
            const [sql, params] = db._parseNamedParams(`
                select 1 from table where one = :one and two = :two and other = :one
            `, { one: 1, two: '2' });
            expect(sql).toBe(`select 1 from table where one = $1 and two = $2 and other = $1`);
            expect(params).toStrictEqual([1, '2']);
            expect(logger.debug).toBeCalledWith(
                'SQL> select 1 from table where one = 1 and two = 2 and other = 1'
            );
        });
    });
});
