const isObjectIdLike = (value: unknown) => {
  return Boolean(
    value &&
    typeof value === 'object' &&
    '_bsontype' in value &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  );
};

export const normalizeResponseAvatars = <T>(value: T, seen = new WeakSet<object>()): T => {
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date || Buffer.isBuffer(value) || isObjectIdLike(value)) return value;

  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => normalizeResponseAvatars(item, seen)) as T;
  }

  const maybeDocument = value as unknown as { toObject?: () => Record<string, unknown> };
  const source = typeof maybeDocument.toObject === 'function'
    ? maybeDocument.toObject()
    : value as Record<string, unknown>;

  const normalized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(source)) {
    if (key === 'avatarUrl' || key === 'avatarPublicId' || key === 'passwordHash') continue;
    normalized[key] = normalizeResponseAvatars(nestedValue, seen);
  }

  if ('avatarUrl' in source && !('avatar' in normalized)) {
    normalized.avatar = source.avatarUrl || '';
  }

  return normalized as T;
};
