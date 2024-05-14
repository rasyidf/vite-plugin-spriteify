# vite-plugin-spriteify

**vite-plugin-spriteify** is a Vite plugin designed to generate a spritesheet with icons from a directory. It automatically updates whenever there are changes (edit, delete, add) in the specified directory being watched. Additionally, it offers the option to generate TypeScript types for the outputted icon names.

## Installation

```bash
npm install -D vite-plugin-spriteify
```

## Usage

### Configuration

To use **vite-plugin-spriteify**, add it to your Vite configuration file (`vite.config.js`) as a plugin:

```javascript
// vite.config.js
import { spriteify } from 'vite-plugin-spriteify';

export default {
  plugins: [
    spriteify({
      inputDir: "icons",
      outputDir: "public/icons",
      fileName: "icons.svg", // optional, default is "sprite.svg"
      typesFileName: "name.d.ts", // optional, default is "types.ts"
      grouped: true, // default false, true if you want to group icons by directory
      withTypes: true, // set it true if you want to generate TypeScript types
      cwd: process.cwd(),
    }),
  ],
};
```

### Example Component

Once the spritesheet is generated, you can use the icons in your components. Here's an example component file:

```jsx
import spriteHref from "~/path/sprite.svg"
import type { SVGProps } from "react"
import type { IconName } from "~/path/types.ts"

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName
}) {
  return (
    <svg {...props}>
      <use href={`${spriteHref}#${name}`} />
    </svg>
  )
}
```

### Using the Component

You can now use the `Icon` component in your JSX by passing the icon name as a prop:

```jsx
<Icon name="plus" />
```

This will render the icon named "plus" from the spritesheet.
