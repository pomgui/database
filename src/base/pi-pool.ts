import { PiDatabase } from './pi-database';

export interface PiDatabasePool {
    get(): Promise<PiDatabase>;
    close(): Promise<void>;
}