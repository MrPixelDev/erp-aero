import { Dispatcher } from './types';

export function log<T extends string | Record<any, any>>(msg: T, nextArr: Array<Dispatcher>) {
    for (const next of nextArr) {
        next(typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2));
    }
}

export function validateUsername(value: string): string | null {
    if (value.length > 36) return 'Id can not be greater than 36 symbols';

    const phoneRegex = /^\d{11}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!(phoneRegex.test(value) || emailRegex.test(value))) {
        return 'Id can be only 11-digits phone number or email';
    }
    return null;
}
