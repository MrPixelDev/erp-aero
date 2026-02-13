export function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Invalid ${field}`);
    }

    return value;
}

export function requireUuid(value, field) {
    const str = requireString(value, field);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(str)) {
        throw new Error(`Invalid ${field}`);
    }

    return str;
}

export function requireId(value) {
    const str = requireString(value, 'id');
    if (str.length > 36) {
        throw new Error('Id can not be greater than 36 symbols');
    }
    const phoneRegex = /^\d{11}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!(phoneRegex.test(str) || emailRegex.test(str))) {
        throw new Error('Id can be only 11-digits phone number or email');
    }
    return str;
}
