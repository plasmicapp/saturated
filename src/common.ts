export function assert(cond: boolean, message?: string): asserts cond {
  if (!cond) {
    throw new Error(message);
  }
}

export function mapAny<T, U>(
  x: T | T[] | undefined | null,
  func: (x: T) => U
): U | U[] | undefined | null {
  if (x == null) {
    return x as null;
  } else if (Array.isArray(x)) {
    return x.map(func);
  } else {
    return func(x);
  }
}

export function omitKeys(obj: any, ...keys: string[]) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, _]) => !keys.includes(key))
  );
}

export function union<T>(...sets: Set<T>[]) {
  const set = new Set<T>();
  for (const s of sets) {
    addToSet(set, ...Array.from(s.values()));
  }
  return set;
}

export function addToSet<T>(set: Set<T>, ...items: T[]) {
  for (const x of items) {
    set.add(x);
  }
}

export function setDiff<T>(set1: Set<T>, set2?: Set<T>) {
  if (!set2) {
    return set1;
  }
  const res = new Set<T>();
  for (const val of Array.from(set1.values())) {
    if (!set2.has(val)) {
      res.add(val);
    }
  }
  return res;
}

export function isPlainObject(thing: any) {
  return (
    thing != null && typeof thing === 'object' && thing.constructor === Object
  );
}

export function isPrimitive(val: any) {
  if (val == null) {
    return true;
  }
  const type = typeof val;
  return type === 'string' || type === 'number' || type === 'boolean';
}
