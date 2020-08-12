import { PiFirebirdDatabase } from "./pi-firebird-database";

describe('Test insert', () => {
    let db: PiFirebirdDatabase;
    beforeEach(() => {
        db = new PiFirebirdDatabase({
            database: '/firebird/data/test/test01.fdb',
            host: '127.0.0.1',
            user: 'sysdba',
            password: 'masterkey',
            port: 3050
        }, 10);
    });

    fdescribe('row_count', () => {

        it('should insert', (done) => {
            db.open()
                // .then(() => db.beginTransaction())
                .then(() => db.query('insert into temp(a) values(1)', {}))
                // .then(() => db.query('insert into temp(a) values(2)', {}))
                // .then(() => db.query('insert into temp(a) values(3)', {}))
                // .then(() => db.commit())
                .then(() => db.close())
                .catch(err => console.error(err))
                .finally(done)
        });
    })
})