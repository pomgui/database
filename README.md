# Database generic library

[![Package Version][package-image]][package-url]
[![Open Issues][issues-image]][issues-url]

PiDatabase is a generic typescript library that provides an interface to execute the normal operations
with a client database driver as connect, start transaction, commit, etc. for different database client drivers. (Currently it supports [node-firebird](https://www.npmjs.com/package/node-firebird) and [mysql](https://www.npmjs.com/package/mysql) drivers)

## Advantages:

- All methods return promises.
- It uses query parameters like `:id` instead of `?`.
- The parameters understand object's hierarchy, so it understands parameters like `:entry.id`.
- The returned rows also are preprocessed to return objects if needed (See Usage Example section).
- It maintains the same interface no matter the database, so it helps with the migration from different databases E.g. MySQL to Firebird or vice versa.

## Installation

Use npm to install the library.

```bash
npm install @pomgui/database --save
```

## Usage Example

### Firebird usage example (using @pomgui/database-mysql)

```typescript
const options = {
    host: 'localhost',
    port: 3050,
    user: 'sysdba',
    password: 'masterkey',
    database: 'test.fdb'
};

async work(){
    const pool = new PiFirebirdPool(options, 10);
    const db = await pool.get();
    await db.beginTransaction();
    try{
        const param = {entry: {id: 3}};
        const data = await db.query(`
            SELECT 
                e.entry_id "id", e.entry_date, 
                b.benef_id "benef.id", b.name "benef.name"
            FROM ENTRIES e JOIN BENEFICIARIES db ON b.benef_id = e.benef_id
            WHERE entry_id >= :entry.id
            LIMIT 0,10`, param);
        console.log(data);
        await db.commit();
    }catch(err){
        console.error(err);
        await db.rollback();
    }finally{
        await db.close();
    }
}
```

This will print something like:

```javascript
[{  id: 3, 
    entryDate: 2020-08-01T00:00:00.000Z,
    benef: {
        id: 1,
        name: 'John Doe'
    }
},{  id: 4, 
    date: 2020-08-02T00:00:00.000Z,
    benef: {
        id: 1,
        name: 'Jane Doe'
    }
}, ...
]
```

### MySQL usage example

```typescript
const options = {
    host: 'localhost',
    user: 'user',
    password: 'secret',
    database: 'test'
};

async work(){
    const pool = new PiMySqlPool(options, 10);
    const db = await pool.get();
    await db.beginTransaction();
    try{
        const param = {entry: {id: 3}};
        const data = await db.query(`
            SELECT 
                e.entry_id "id", e.entry_date, 
                b.benef_id "benef.id", b.name "benef.name"
            FROM ENTRIES e JOIN BENEFICIARIES db ON b.benef_id = e.benef_id
            WHERE entry_id >= :entry.id
            LIMIT 0,10`, param);
        console.log(data);
        await db.commit();
    }catch(err){
        console.error(err);
        await db.rollback();
    }finally{
        await db.close();
    }
}
```
This will print something like:

```javascript
[{  id: 3, 
    entryDate: 2020-08-01T00:00:00.000Z,
    benef: {
        id: 1,
        name: 'John Doe'
    }
},{  id: 4, 
    date: 2020-08-02T00:00:00.000Z,
    benef: {
        id: 1,
        name: 'Jane Doe'
    }
}, ...
]
```




[project-url]: https://github.com/pomgui/database
[package-image]: https://badge.fury.io/js/@pomgui%2Fdatabase.svg
[package-url]: https://www.npmjs.com/package/@pomgui/database
[issues-image]: https://img.shields.io/github/issues/pomgui/database.svg?style=popout
[issues-url]: https://github.com/pomgui/database/issues
