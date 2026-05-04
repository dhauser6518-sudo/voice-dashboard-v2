import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.APP_DATA_KEY;
const KEY = KEY_HEX && KEY_HEX.length === 64 ? Buffer.from(KEY_HEX, 'hex') : null;

export type EncryptedValue = {
  ct: string;
  iv: string;
  tag: string;
  v: number;
};

export function encrypt(plaintext: string): EncryptedValue | null {
  if (!KEY) {
    console.error('[encryption] APP_DATA_KEY not set');
    return null;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ct: ct.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    v: 1,
  };
}

export function decrypt(payload: EncryptedValue | string | null | undefined): string | null {
  if (!KEY) {
    console.error('[encryption] APP_DATA_KEY not set');
    return null;
  }
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (!payload.ct) return null;

  try {
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ct = Buffer.from(payload.ct, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[encryption] decrypt failed:', (err as Error).message);
    return null;
  }
}

const SENSITIVE_FIELDS = ['ssn', 'routing_number', 'account_number', 'driver_license'];

export function decryptApplicationData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const result: Record<string, unknown> = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && typeof result[field] === 'object' && (result[field] as EncryptedValue).ct) {
      result[field] = decrypt(result[field] as EncryptedValue);
    }
  }
  return result;
}
