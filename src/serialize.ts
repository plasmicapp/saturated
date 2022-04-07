interface OutputOpts {
  knownClientRefs: Record<string, any>;
}

const SYMBOL_PREFIX = '$s$s';
const REF_PREFIX = '$s$r';

export function deserializeSaturated(value: string, opts: OutputOpts) {
  return JSON.parse(value, function(_, value) {
    if (typeof value === 'string') {
      if (value.startsWith(SYMBOL_PREFIX)) {
        return Symbol.for(value.substring(SYMBOL_PREFIX.length));
      } else if (value.startsWith(REF_PREFIX)) {
        return opts.knownClientRefs[value.substring(REF_PREFIX.length)];
      }
    }
    return value;
  });
}

export function serializeSaturated(element: any, opts: OutputOpts) {
  const inverted = new Map(
    Array.from(Object.entries(opts.knownClientRefs)).map(([key, val]) => [
      val,
      key,
    ])
  );
  return JSON.stringify(element, function(key, value) {
    if (key === '_owner' || key === '_store') {
      return undefined;
    }

    if (typeof value === 'symbol') {
      return `${SYMBOL_PREFIX}${Symbol.keyFor(value)}`;
    }

    const ref = inverted.get(value);
    if (ref) {
      return `${REF_PREFIX}${ref}`;
    }

    if (typeof value === 'function') {
      throw new Error(`Unknown reference: ${key}=${value}`);
    }
    return value;
  });
}
