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
import { iconSpritesheet } from 'vite-plugin-icons-spritesheet';

export default {
  plugins: [
    iconSpritesheet({
      // Whether to generate TypeScript types (defaults to false)
      withTypes: true,
      // Path to the icon directory
      inputDir: "icons",
      // Output path for the generated spritesheet and types
      outputDir: "public/icons",
      // Name of the generated spritesheet (defaults to sprite.svg)
      fileName: "icon.svg",
      // Current working directory (defaults to process.cwd())
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
