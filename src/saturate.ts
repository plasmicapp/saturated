import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  addToSet,
  assert,
  isPrimitive,
  mapAny,
  omitKeys,
  setDiff,
  union,
} from './common';

interface SaturateOpts {
  /**
   * Set of known client references; mainly client components, but could also be other things that
   * cannot be serialized but need to be present on the browser. These must be passed into
   * serializeSaturated() and deserializeSaturated() as well.
   */
  knownClientRefs?: Set<any>;

  /**
   * Set of components that you want to force to be statically inlined, even if it uses hooks,
   * passes down closures, etc. Note this does not necessarily guarantee that you won't find
   * instances of this component in the saturated node; it may still not be inlined if its
   * siblings are not inline-able.
   */
  forceStatic?: Set<any>;

  /**
   * Whenever a client component is detected, it is added to this set. You can use this to
   * collect the set of client components that you need to pass into serializeSaturated()
   * and deserializeSaturated().
   */
  detectedClientComponents?: Set<any>;
}

interface SaturateResult {
  element: React.ReactNode;
  isStatic: boolean;
  invalidClientRefs: Set<any>;
}

/**
 * Converts the argument ReactNode into a "saturated" ReactNode
 */
export function saturate(
  element: React.ReactNode,
  opts: SaturateOpts
): React.ReactNode {
  const detectedClientComponents = opts.detectedClientComponents ?? new Set();
  const res = saturateNode(element, { ...opts, detectedClientComponents });
  if (detectedClientComponents.size > 0) {
    const knownRefs = opts.knownClientRefs ?? new Set();
    const unknownRefs = Array.from(detectedClientComponents).filter(
      c => !knownRefs.has(c)
    );
    if (unknownRefs.length > 0) {
      console.warn(
        `Cannot properly saturate due to missing client components:`,
        unknownRefs
      );
    }
  }
  return res.element;
}

function saturateNode(
  node: React.ReactNode,
  opts: SaturateOpts
): SaturateResult {
  if (React.isValidElement(node)) {
    if (typeof node.type === 'string') {
      return saturateHostElement(node, opts);
    } else {
      return saturateComponentElement(node, opts);
    }
  } else if (Array.isArray(node)) {
    const res = node.flatMap(x => saturateNode(x, opts));
    return {
      element: res.map(r => r.element),
      isStatic: res.every(r => r.isStatic),
      invalidClientRefs: union(...res.map(r => r.invalidClientRefs)),
    };
  } else if (isPrimitive(node)) {
    return {
      element: node,
      isStatic: true,
      invalidClientRefs: new Set(),
    };
  } else if (opts.knownClientRefs?.has(node)) {
    return {
      element: node,
      isStatic: false,
      invalidClientRefs: new Set(),
    };
  } else if (typeof node === 'function') {
    return {
      element: node,
      isStatic: false,
      invalidClientRefs: new Set([node]),
    };
  } else {
    // assume this is JSON-serializable
    return {
      element: node,
      isStatic: false,
      invalidClientRefs: new Set(),
    };
  }
}

const SELF_CLOSING_TAGS = [
  'img',
  'input',
  'textarea',
  'source',
  'meta',
  'embed',
  'link',
  'track',
  'wbr',
  'hr',
];

/**
 * Saturates a base html element
 */
function saturateHostElement(
  element: React.ReactElement,
  opts: SaturateOpts
): SaturateResult {
  const { type, props } = element;

  assert(typeof type === 'string');

  const { children, ...rest } = props;

  if (opts.forceStatic?.has(type)) {
    return {
      element,
      isStatic: true,
      invalidClientRefs: new Set(),
    };
  }

  const clientRefs = collectHostElementClientRefs(element);
  const invalidClientRefs = setDiff(clientRefs, opts.knownClientRefs);

  if (SELF_CLOSING_TAGS.includes(type)) {
    // These tags don't have children, so no need to check them
    return {
      element,
      isStatic: clientRefs.size === 0,
      invalidClientRefs,
    };
  }

  const newChildren = saturateNode(children, opts);

  if (newChildren.isStatic) {
    // All the children are static also, so we can turn this tag into a
    // saturated tag!
    const innerHTML = ReactDOMServer.renderToStaticMarkup(
      createElement(
        React.Fragment,
        {},
        mapAny(newChildren.element, x => {
          if (React.isValidElement(x) && x.props['data-saturated']) {
            return createElement(x.type, omitKeys(x.props, 'data-saturated'));
          } else {
            return x;
          }
        })
      )
    );

    return {
      element: createElement(type, {
        dangerouslySetInnerHTML: { __html: innerHTML },
        'data-saturated': true,
        ...rest,
      }),
      isStatic: clientRefs.size === 0,
      invalidClientRefs: invalidClientRefs,
    };
  } else {
    return {
      element: createElement(type, rest, newChildren.element),
      isStatic: false,
      invalidClientRefs: union(
        invalidClientRefs,
        newChildren.invalidClientRefs
      ),
    };
  }
}

/**
 * Collect invalid (non-serializable) props from host element
 */
function collectHostElementClientRefs(element: React.ReactElement) {
  const refs = new Set<any>();
  const props = element.props;
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (['style', 'children', 'dangerouslySetInnerHTML'].includes(key)) {
        continue;
      }
      if (!isPrimitive(val)) {
        refs.add(val);
      }
    }
  }
  if (!isPrimitive((element as any).ref)) {
    refs.add((element as any).ref);
  }
  return refs;
}

function componentName(thing: any) {
  return thing.displayName ?? thing.name;
}

function saturateComponentElement(
  element: React.ReactComponentElement<any, any>,
  opts: SaturateOpts
): SaturateResult {
  const { type, props } = element;

  if (element.type === Symbol.for('react.fragment')) {
    return saturateNode(element.props.children, opts);
  }

  // We try to aggressively saturate props passed to the component, even if the component
  // itself cannot be inlined (similar to how server components do it). Careful here though;
  // if we ever support inlining components that use React.useContext(), we cannot just
  // render props outside of the component like this.
  const clientRefsFromProps = new Set<any>();
  const newProps: any = {};
  for (const [key, val] of Object.entries(props)) {
    const newVal = saturateNode(val as any, opts);
    addToSet(
      clientRefsFromProps,
      ...Array.from(newVal.invalidClientRefs.values())
    );
    newProps[key] = newVal.element;
  }
  if (!isPrimitive((element as any).ref)) {
    clientRefsFromProps.add((element as any).ref);
  }
  const invalidClientRefsFromProps = setDiff(
    clientRefsFromProps,
    opts.knownClientRefs
  );

  if (opts.forceStatic?.has(type)) {
    // If this component is forced to be static, then just return it as-is,
    // and let it be turned into static html by its parent
    return {
      element: React.cloneElement(element, newProps),
      isStatic: true,
      invalidClientRefs: new Set(),
    };
  }

  if (opts.knownClientRefs?.has(type)) {
    // If we already know this component needs to be hydrated, then just
    // return it as-is
    if (!opts.detectedClientComponents?.has(type)) {
      opts.detectedClientComponents?.add(type);
      console.log(`Encountered known client component: ${componentName(type)}`);
    }
    return {
      element: React.cloneElement(element, newProps),
      isStatic: false,
      invalidClientRefs: invalidClientRefsFromProps,
    };
  }

  let rendered;
  try {
    rendered = renderComponentElement(type, newProps);
  } catch (e) {
    if (!opts.detectedClientComponents?.has(type)) {
      opts.detectedClientComponents?.add(type);
      console.log(`Failed to render ${componentName(type)}`, e);
    }
    return {
      element: React.cloneElement(element, newProps),
      isStatic: false,
      invalidClientRefs: invalidClientRefsFromProps,
    };
  }

  const res = saturateNode(rendered, opts);

  // The resulting rendered element may include some invalid client refs.
  // If those invalid client refs are from THIS component (say, this component
  // installed an event handler on a DOM element, etc.), then we cannot compile
  // this component away.  But if all the invalid refs are from outside of
  // THIS component (for example, in `children` prop passed in from parent),
  // then this component is not adding any value and can be compiled away.
  const invalidClientRefsFromSelf = setDiff(
    res.invalidClientRefs,
    invalidClientRefsFromProps
  );

  if (invalidClientRefsFromSelf.size > 0) {
    // We need to keep this component!
    if (!opts.detectedClientComponents?.has(type)) {
      opts.detectedClientComponents?.add(type);
      console.log(`Failed to compile away ${componentName(type)}`);
    }
    return {
      element: React.cloneElement(element, newProps),
      isStatic: false,
      invalidClientRefs: invalidClientRefsFromProps,
    };
  }

  // Otherwise it is safe to "compile away" this component; that is, this component
  // is not adding any logic or behavior because it's not attaching any event
  // handlers or using any state.  It may still evaluate to non-static content,
  // but at least this component itself is not necessary.
  return res;
}

function renderComponentElement(type: any, props: any) {
  if (type === Symbol.for('react.fragment')) {
    return props.children;
  } else if (type.$$typeof === Symbol.for('react.forward_ref')) {
    // is this even right
    return type.render(props);
  } else if (typeof type === 'function') {
    return type(props);
  } else {
    // just going to ignore class-based components for now
    console.error('Unknown type', type);
    throw new Error(`Unknown type`);
  }
}

function createElement(type: any, props: any, children?: any) {
  if (Array.isArray(children)) {
    return React.createElement(type, props, ...children);
  } else {
    return React.createElement(type, props, children);
  }
}
