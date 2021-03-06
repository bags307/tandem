> Note that Tandem was intented to be a visual editor that runs any kind of application out of the box. This big audatious hairy goal has since been scaled back to something that's a bit more feasible (with the amount of time I have) for a version 1 of the application. 

Tandem is a visual designer for creating web components.

![screenshot 2016-12-22 15 48 03](https://cloud.githubusercontent.com/assets/757408/22388273/ce17a5e0-e4ad-11e6-9327-7d7ba3dc95bf.png)

By default, web components built in Tandem are written in a simple to read & write format, called Paperclip. Paperclip web components are intented to be light weight, and compileable to many frameworks (React for starters).

## Planned features

#### (v1) Artboards

Artboards are similar to Sketch, and provide you aerial view of all of your web components. Artboard changes also affect one another, so a CSS color change for example may affect another artboard that shares the same CSS property. For example:

![ezgif-1-e0c05e0cbf](https://user-images.githubusercontent.com/757408/32658161-a855af7e-c610-11e7-9129-769a112e0031.gif)

> Artboards in Tandem are _actually_ individual browser VMs that are _almost_ to spec with web APIs, which means that they can run fairly complex applications.

#### (v1) Stage tools

The stage, as in, the artboard that you edit directly. The stage will contain tools similar to what you'd find in sketch, like moving elements around:

![ezgif-4-47f92ab768](https://user-images.githubusercontent.com/757408/32700619-6b6da732-c7bf-11e7-82de-b15f4d3101e4.gif)

> When dragging elements around, `left`, `top`, and `position` styles are defined on the element by default. You can however have the dragger target a selector by using the CSS pane. You will also be able to easily drag & drop CSS properties to other style rules in case you need to re-organize CSS (which should make Tandem's default targeting of style attributes less of an issue)

Other features include:

- pixel grid (when zoomed in)
- text editing
- multi selection

#### (v1) Components pane

The components pane will display native elements (`div`, `span`, `h1`), along with custom components from your file system. Items in the components pane will be draggable to any element or component on stage (where the artboards are).

#### Text editor (VSCode) integration

Tandem will be installable as an extension of your visual editor -- currently for VSCode. 

#### (v1) CSS editor

The CSS editor provides you with a 1-1 map of the visual styles of your application. The inspector also comes with a set of other helper utilities such as a color picker, box shadow editor, filter editor, and other tools to help style components. Here's the current design of the css editor:

<img width="278" alt="screenshot 2017-11-12 15 17 05" src="https://user-images.githubusercontent.com/757408/32700419-ddb57ef8-c7bc-11e7-8603-989eff2904fe.png">

> The CSS editor is similar to Chrome's web inspector, except that the css editor actually writes to the source code.

#### (v1) Webpack React loader

The webpack react loader allows you to compile paperclip files to react components, and import them in your application.

#### (v2) More text editor integrations

Atom will be support, along with Sublime, and possibly other text editors.

#### (v2) Stage tools

The next bunch of stage tools will offer more visual helpers & guides to help with pixel perfect designs. They will include:

- Measurement tools
- Snap-to-place tools (when dragging elements)


#### (v2) Build button

Eventually, Tandem will come with a build button for projects that will work out of the box, along with a command line option for bundling apps for deployment (`tandem build`, or something like that). This feature is planned to make it easier for less technical people to make UI changes, and preview their UIs in a production application. The build step will likely use `webpack` in the background, but may be configured to support other bundlers as well. 

### Tandem Goals

- To help make code the single source of truth for UI design (PSD, sketch, and other files should not be the single source of truth). This means coming up with a set of tools that designers feel comfortable with.
- Cover _most_ UI cases for the web (the relatively simple parts), and offer tooling that makes it easier to create UIs that must be written by hand. 
- To augment web UI development. This means that UI tools will always reflect HTML & CSS. 
- Reduce amount of tooling required to build web UIs. Tandem should work out of the box, and without needing any configuration. 
- To integrate with existing tools, languages, and frameworks. Tandem should work with your existing stack, not the other way around.
- To reduce vendor lock-in. You shouldn't be stuck using Tandem.
- To create an environment where developers & designers can work out of the same environment.


### Tandem Non-goals

- To build tooling that allows non-programmers (or people that don't want to) to build web components. Tandem's user experience will always be for designers, and developers. 
- To be _completely_ visual. Tandem will never hide code from you. 
- To replace writing code by hand. Tandem will only cover UI, and simple logic (dynamic text, repeated elements, and conditional elements).
- To replace web debugging tools such as Chrome's web inspector. Tandem be designed to compliment those tools. 
- To support languages that are not designed for visual editing. SASS, LESS, and JSX, and other frameworks are optimized for good developer experience, but do a poor job producing code that is visually editable (things like `1 + 1`, and other computed properties are hard to change visually). 
- To suport very sophisticated web components. Tandem will be designed to support web components with _simple_ behavior. Complicated components will need to be written by hand in a language such as JSX that's more expressive (which is probably the best option anways). Developer tooling will also be provided so that engineers can inject behavior into a web component created in Tandem (either as a higher order function, or view controller). 

## Technical details

Below are some of the technical details, ideas, whys, and motivations about some of the grittier things around Tandem.

## Paperclip

Paperclip is a design language that is optimized for visual editing. Think of it like a `.xib` file format for the web.

#### Motiviation

Paperclip is an open file format that allows for somewhat expressive behavior to be shared across multiple components. Certain behavior can be defined in Paperclip templates such as repeated elements, conditionals, and dynamic text. Here's an example:

```html

<!-- ID should come with a prefix -- something web component friendly  that wouldn't conflict with native elements -->
<component id="x-people">

  <!-- styles are scoped to the component, just like web components -->
  <style> 
    :host {
      border: 1px solid var(--border-color);
    }

    li:nth-child(2n) {
      background: var(--background-alt);
    }
  </style>

  <template>
    <ul>
      <li [[repeat people as person]]>
        Hello [[bind person.name]]

        <!-- basic expressions are okay -->
        <span [[if person.age > 10]]>
          You are ten years old.
        </span>

        <!-- comments are also allowed -->
        <span [[if person.age > 12]]>
          You are twelve years old.
        </span>
      </li>
    </ul>
  </template>
</component>
```

The format above is similar to other template languages such as Handlebars, and Mustache, but the syntax is designed for visual editing (Certain features augment tooling in Tandem). Paperclip is intentially limited to ensure that it's lightweight, and performant within Tandem (Only HTML, CSS, and built-in expressions are allowed). Complex behavior can be added by wrapping Paperclip components with higher order components. 

> Simplicity also offers some neat benefits around performance. Since Paperclip is declarative and bindings are identified at compile time, the compiled output of Paperclip can be optimized to the _bare minimum_ amount of operations required to update a dynamic UI.

#### Paperclip Goals

- To provide a syntax that is relatively close to web standards. 
- Provide a syntax that can be compiled to other languages, and frameworks. 
- Provide a syntax that's designed for visual editing, but human readable.
- Type safety to ensure breaking changes to UI can be traced to other web components.
- Provide syntaxes that augment the user experience of Tandem.

#### Paperclip Non-goals

- Support complicated behavior that cannot be backtraced. 
- Support for multiple languages. It's just HTML, CSS, and Paperclip-specific syntax. 
- Support for inline scripts. This behavior must be injected into the web component. 

#### Targeting multiple platforms

Paperclip is designed to be compiled to _other_ frameworks. Version 1 of Paperclip will come with a React target. Future versions of Paperclip with likely have targets for `Vue`, `Preact`, `Angular`, `PHP`, `Ruby`,  among other languages and frameworks.

To integrate Paperclip into your existing JavaScript codebase (assuming you've installed the necessary dependencies), all you need to do to import Paperclip files as regular modules. Assuming that you have a paperclip file named `people-list.pc` that looks like this:

```html
<component id="people-list">
  <template>
    <ul>
      <li [[repeat people as person]]>
        [[bind person.name]]
      </li>
    </ul>
  </template>
</component>
```

You can import the `people-list.pc` file like so:
Compiled Paperclip files export a special hydration function for each component.

```typescript
import { hydratePeopleList, PeopleListProps } from "./people-list.pc";
import * as React from "react";
import { compose, pure, withHandlers } from "recompose";

const enhance =  compose<PeopleListProps, PeopleListProps>(
  withState("people", "setPeople", [{ name: "Drake" }, { name: "50c" }])),
  // more HOC code
);

export const PeopleList = hydratePeopleList(enhance);
```

 The `hydratePeopleList` function is emitted by the `people-list` component at compile time, and it allows you to extend the functionality of the base component written in Paperclip (which is kind of necessary because Paperclip is intentionally "dumb"). All components defined in paperclip files emit a hydration function. The basic API for the hydration function is `hydrateMyCustomComponent(enhancer, childComponentClasses)`. The first parameter is a higher order function that wraps around the base Paperclip component. The second parameter allows you to inject child components. Suppose we have a `todo-list` component:

```html
<component id="todo-list-item">
  <style>
    :host([done]) {
      text-decoration: line-through;
    }
  </style>
  <template>
    <li>
      <input type="checkbox" checked=[[bind toggleDone]] />
      [[bind text]]
    </li>
  </template>
</component>

<component id="todo-list">
  <template>
    <people-list-item [[repeat items as item]] [[bind item]] />
  </template>
</component>
```

In our higher order component code (in regular JSX this time), we can hydrate this module like so:

```typescript
import * as React from "react";
import { hydrateTodoListItem, hydrateTodoList } from "./todo-list.pc";

// enhances todo-list-item with code that handles toggleDone interactions
const enhanceTodoListItem = BaseTodoListItem => {
  return class EnhancedTodoListItem extends React.Component {
    constructor() {
      super();
      this.state = {};
    }
    toggleDone() {
      this.setState({ done: !this.state.done })
    }
    render() {
      return <BaseTodoListItem {...this.props} {...this.state} toggleDone={this.toggleDone} />;
    }
  }
};

export const TodoListItem = hydrateTodoListItem(enhanceTodoListItem);

// used for the the todo list since we don't want to enhance it -- just
// use the base component defined in the template
const identity = value => value;

export const TodoList = hydrateTodoList(identity, {
  TodoListItem: TodoListItem
});

```

If you want to see how this sort of pattern works in a real codebase, you can checkout the [Tandem component source code](./packages/tandem-app/src/front-end/components). 

### Paperclip syntax

Paperclip currently implements a limited set of operations, more planned in the future. The format is inspired by web components, and will continue to support features that are relatively close to web standards (so long as they do not conflict with the editing experience). 

##### `[[bind]]` block

Prints the statement following `bind`. Example:

```html
<li style=[[bind style]]>
  [[bind text]]
</li>
```

Note the `style` binding above doesn't have wrapping quotes, which provides different behavior. For example:

```html
<li class="[[bind class]]">
</li>
```

Defines an _attribute_ on the element, which can only be a `string`, whereas ommitting the quotes defines a _property_ on the target element, which can be any type. If we want to define a class to a property for example, we'll have to do this:

```html
<li className=[[bind className]]>
</li>
```

Since `className` is a property of html elements, wherease `class` is not (it's an attribute). This distinction comes in handy depending on the element you're dealing with. 

##### Spreading properties

Spreading allows you to map an object to the properties of a component. Here's an example:

```html
<component id="x-full-name-label">
  <template>
    [[bind firstName]] [[bind lastName]]
  </template>
</component>

<x-full-name-label [[bind { firstName: "Joe", lastName: "Shmo" }]]>
```

##### `[[repeat]]` block

`[[repeat]]` blocks `repeat` the element that they're attached to. Example:

```html
<component [[property people]]>  
  <template>
    <ul>
      <li [[repeat people as person]]>
        [[bind person]]
      </li>
    </ul>
  </component>
</component>
```

Note that `[[property]]` must be defined.

#### [[emit click]] block

Attaches an event listener to an element. Events that are dispatched by the element also contains the context of the element.  For example:

```html
<component id="x-clicker">
  <template>
    <a id="some-button" href="#" [[emit click]]>
      current count: [[bind count]]
    </a>
  </template>
</component>
```

The `a` button in the above component emits a plain javascript object of `{ type: "EVENT", payload: { triggerEvent: sourceMouseEvent, context: { count: 0 }}}`, which should be handled by a higher order component that defines a `handleEvent` property. If a `handleEvent` is _not_ present, then event will bubble up until it reaches one. `handleEvents` that _are_ defined must call a higher order `handleEvent` function in order for bubbling to occur.  

#### <style /> elements

Styles are scoped to the components they're defined in (this is similar to the web component spec -- and you can read more about some of the patterns around it on MDN). This means that they only cascade to the immediate elements that are defined within the component's template. For example:

```html
<component id="x-button">
  <style>
    :host {
      color: red;
    }
  </style>
  <template>
    <a href="#">click me!</a>
  </template>
</component>
```

The style above only applies to _that_ component.  If you want to import styles that are shared across multiple components, then you can "pierce" component styles by importing them directly within the style block:

```html
<component id="x-button">
  <style>
    @import "./global.css";
    :host {
      color: red;
    }
  </style>
  <template>
    <a href="#">click me!</a>
  </template>
</component>
```

Additionally, you can define global variables that _can_ be used in components like so:

```html
<style>
  :root {
    --font-color: red;
  }
</style>
<component id="x-button">
  <style>
    :host {
      color: var(--font-color);
    }
  </style>
  <template>
    <a href="#">click me!</a>
  </template>
</component>
```

### Paperclip Roadmap 💫

Paperclip is designed for the future to make the following ideas possible.

#### Type inferencing

TODO

#### More compile targers

Paperclip currently compiles to Vanilla JS, and React. In the future, Paperclip will eventually target other frameworks. Vue, and Angular are on the short-list of frameworks to create tooling for next. Backend languages on the other hand will likely take more time to design since events will need to be accounted for (`onClick` events for instance would need to somehow hit an API). 

#### More features that integrate with visual editor

Paperclip will eventually have features that are specific for visual editing, but are stripped out at compile time. 


##### `[[note]]` block

`Notes` are attachable to any element in the visual editor, where each note contains comments & discussions about each element they're attached to. Threads will also be a part of notes will allow collaborators -- other people on your team -- to leave comments (similar to google docs). Notes will _only_ be addable in the designer, and their contents stored in an API backend. Here's a basic example of what a note block will look like in a paperclip file:

```html
<component id="people-list">
  <template>  
    <span [[note AUTOMATICALLY_GENERATED_ID]]>

    </span>
  </template>
</component>
```

> Note that information that should convey details to a developer reading this file should be left as a regular HTML comment. `Notes` are comments for visual information. 

#### `[[fixture]]` block

TODO

#### `[[i8n]]` block

The i18n, or internationalization block  will be used for translations. Translations will be visible directly within the visual editor. 

#### GIT conflict support

GIT conflicts will be supported in Paperclip, and will allow designers & developers to visually resolve conflicting changes, directly within the visual editor. Assuming that multiple artboards are visible, users will be able to toggle between different versions of a component and observe how their changes affect other UIs. 

#### DFA support

More on this soon, but Paperclip should work with FSMs so that that components and their relationships with
each other can be represented visually.