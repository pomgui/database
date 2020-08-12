export class PiError extends Error {
    status?: number;
    constructor(public message: string, status?: number) { super(message); this.status = status; }
    static status(status: number, msg?: string): PiError {
        return new PiError(msg || ('http status code: ' + status), status);
    }
}