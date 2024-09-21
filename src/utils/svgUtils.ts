import { glob } from 'glob';
import path from 'path';
import { PluginProps } from '../types';

/**
 * Retrieves SVG files asynchronously.
 */
export const getSvgFiles = async (inputDir: string): Promise<string[]> => {
  try {
    const files = await glob('**/*.svg', { cwd: inputDir });
    return files;
  } catch (error) {
    throw new Error(`Failed to retrieve SVG files: ${(error as Error).message}`);
  }
};

/**
 * Transforms icon names using a provided transformer function.
 */
export const transformIconName = (
  fileName: string,
  transformer: (iconName: string) => string
): string => {
  const baseName = path.basename(fileName, '.svg');
  return transformer(baseName);
};

/**
 * Converts kebab-case filenames to CamelCase.
 */
export const fileNameToCamelCase = (fileName: string): string => {
  return fileName
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

/**
 * Generates a symbol ID based on the file name and plugin options.
 */
export const createSymbolId = (name: string, options: PluginProps): string => {
  const { symbolId } = options;
  return symbolId ? symbolId.replace(/\[name\]/g, path.basename(name, '.svg')) : fileNameToCamelCase(name);
};

/**
 * Determines where to inject the SVG sprite in the DOM.
 */
export const domInject = (inject: 'body-first' | 'body-last'): string => {
  return inject === 'body-first'
    ? 'body.insertBefore(svgDom, body.firstChild);'
    : 'body.appendChild(svgDom);';
};
