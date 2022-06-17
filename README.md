# @plasmicapp/saturated

# EXPERIMENTAL DO NOT USE

This is an experimental, TOY JUST FOR FUN library, for transforming a React element tree to one with minimal hydration.

**See [blog post](https://plasmic.app/blog/minimizing-react-hydration-with-saturated) for more details.**

## What it does

When given a React element, the lib will return a new React element that has converted as much of the original tree as possible to static HTML automatically-ish. We call this process, `saturation`.

Our strategy is this: we’re going to try to “render” this initial React element, like `<Page />`, into a tree of base HTML elements as much as possible. Then, starting from the leaves, we check if each base HTML element can be `saturated`. Simply, if it doesn’t have any event handlers (`onClick`, etc), it can be saturated.  

We do this recursively — a base HTML element can be saturated if it doesn’t have any illegal props, and all its children can be saturated as well.

## How it works
We do this using the `dangerouslysetInnerhtml` prop an escape hatch for rendering some arbitrary HTML in an element. Since React does not attempt to understand what’s in the HTML blob during hydration, it just happily skips over it and we can lower the cost of hydration as a result.

```js
// This...
<div className="greetings">
  <h1>Hello world!</h1>
  <div>Happy to see you too</div>
</div>

// Will be turned into...
<div className="greetings" dangerouslySetInnerHTML={{__html: `
  <h1>Hello world!</h1>
  <div>Happy to see you too</div>
`}} />
```

But what happens if we encounter a component?  In this proof-of-concept, we “render” this component the lazy way — since React components are just functions that produce more React elements, we can just call the component with its props to “render” it!

```js
function Greeting({name}) {
  return <div className="greet">Hello {name}!</div>;
}

// This...
<Greeting name="Pikachu" />

// can be turned into...
<div className="greet" dangerouslySetInnerHTML={{__html: `
  Hello Pikachu!
`}} />
```
