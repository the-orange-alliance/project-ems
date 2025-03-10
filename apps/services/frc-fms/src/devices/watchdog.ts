

export default class Watchdog {

    private callback: () => void;
    private timeout: number;
    private cbTimeout: any;

    constructor (callback: () => void, timeout: number) {
        this.callback = callback;
        this.timeout = timeout;

        this.cbTimeout = setTimeout(callback, timeout * 20); // Initial timeout is significantly longer than rest to allow for startup
    }

    public feed() {
        clearTimeout(this.cbTimeout);
        this.cbTimeout = setTimeout(this.callback, this.timeout);
    }
}