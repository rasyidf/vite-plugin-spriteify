import chalk from 'chalk';
import { mkdir, readFile } from 'fs/promises';
import { glob } from 'glob';
import { parse } from 'node-html-parser';
import path from 'path';
import { logger } from './logger';
import { GenerateSpriteProps, GenerateTypeProps, PluginProps } from "./types";
import { toCamelCase, toTitleCase, writeIfChanged } from './utils';


/**
 * Generates SVG icons or sprites based on the provided configuration.
 *
 * @param inputDir - The directory containing the input SVG files.
 * @param outputDir - The directory where the generated icons or sprites will be saved.
 * @param grouped - A boolean indicating whether the icons should be grouped into separate sprite files based on their directory.
 * @param cwd - The current working directory. If not provided, the process's current working directory will be used.
 * @param withTypes - A boolean indicating whether to generate TypeScript type definitions for the icons.
 * @param fileName - The name of the generated sprite file. Defaults to 'sprite.svg'.
 * @param typeFileName - The name of the generated TypeScript type definitions file. Defaults to 'types.ts'.
 */
export const generateIcons = async ({
  inputDir,
  outputDir,
  grouped,
  cwd,
  withTypes = false,
  fileName = 'sprite.svg',
  typeFileName = 'types.ts',
}: PluginProps) => {
  const cwdToUse = cwd ?? process.cwd();
  const inputDirRelative = path.relative(cwdToUse, inputDir);
  const outputDirRelative = path.relative(cwdToUse, outputDir);

  const files = glob.sync('**/*.svg', {
    cwd: inputDir,
  });

  if (files.length === 0) {
    logger.warn(`No SVG files found in ${chalk.red(inputDirRelative)}`);
    return;
  }

  await mkdir(outputDirRelative, { recursive: true });

  if (grouped) {
    const groupedFiles: Record<string, string[]> = {};

    files.forEach((file) => {
      const directory = path.dirname(file);
      groupedFiles[directory] = groupedFiles[directory] || [];
      groupedFiles[directory].push(file);
    });

    for (const groupDir in groupedFiles) {
      const groupTypesafe = toCamelCase(groupDir.replace(/[^a-zA-Z0-9]/g, '_'));
      const groupFileName = fileName.replace('.svg', `_${groupTypesafe}.svg`);
      const groupTypeFileName = typeFileName.replace('.ts', `_${groupTypesafe}.ts`);
      await generateSvgSprite({
        files: groupedFiles[groupDir],
        inputDir,
        outputPath: path.join(outputDir, groupFileName),
        outputDirRelative,
      });
      if (withTypes) {
        await generateTypes({
          names: files.map((file) => toCamelCase(file.replace(/\.svg$/, ''))),
          outputPath: path.join(outputDir, groupTypeFileName),
          namespace: groupTypesafe,
        });
      }
    }

  } else {
    await generateSvgSprite({
      files,
      inputDir,
      outputPath: path.join(outputDir, fileName),
      outputDirRelative,
    });
    if (withTypes) {
      await generateTypes({
        names: files.map((file) => toCamelCase(file.replace(/\.svg$/, ''))),
        outputPath: path.join(outputDir, typeFileName),
      });
    }
  }


};



/**
 * Generate an SVG spritesheet from a list of SVG files.
 *
 * @param {GenerateSpriteProps} props - The properties for generating the sprite.
 * @returns {Promise<void>} A Promise that resolves when the SVG spritesheet is generated.
 */
const generateSvgSprite = async (props: GenerateSpriteProps): Promise<void> => {
  const { files, inputDir, outputPath, outputDirRelative } = props;
  try {
    const processed = await Promise.all(files.map(file => processSvgFile(file, inputDir)));

    const { symbols, styles } = processed.reduce((acc, { symbol, styles }) => {
      acc.symbols.push(symbol);
      acc.styles.push(styles);
      return acc;
    }, { symbols: [] as Array<string>, styles: [] as Array<string> });

    const output = createSvgSprite(symbols, styles);

    await writeIfChanged(outputPath, output, `🖼️  Generated SVG spritesheet in ${chalk.green(outputDirRelative)}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error generating SVG spritesheet: ${error.message}`);
    }
  }
};

/**
 * Process a single SVG file.
 *
 * @param {string} file - The name of the SVG file.
 * @param {string} inputDir - The directory where the SVG files are located.
 * @returns {Promise<string>} A Promise that resolves with the processed SVG symbol or an empty string if an error occurs.
 */
const processSvgFile = async (file: string, inputDir: string): Promise<{ symbol: string, styles: string; }> => {
  try {
    const fileName = toCamelCase(file.replace(/\.svg$/, ''));
    const input = await readFile(path.join(inputDir, file), 'utf8');

    const root = parse(input);
    const svg = root.querySelector('svg');
    if (!svg) {
      throw new Error(`No SVG tag found.`);
    }

    svg.tagName = 'symbol';
    svg.setAttribute('id', fileName);

    removeAttributes(svg as any, ['xmlns', 'xmlns:xlink', 'version', 'width', 'height']);

    const defs = svg.querySelector('defs');
    if (defs) {
      defs.childNodes.forEach((child) => svg.appendChild(child));
      defs.remove();
    }

    const styles = root.querySelectorAll('style').map((style) => style.toString());

    // remove style tags from the svg
    root.querySelectorAll('style').forEach((style) => style.remove());

    return { symbol: svg.toString(), styles: styles.join('\n') };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error processing ${file}: ${error.message}`);
    }
    return { symbol: '', styles: '' };
  }
};

/**
 * Remove specified attributes from an SVG element.
 *
 * @param {HTMLElement } svg - The SVG element.
 * @param {Array<string>} attributes - The list of attributes to remove.
 */
const removeAttributes = (svg: HTMLElement, attributes: Array<string>): void => {
  attributes.forEach(attr => svg.removeAttribute(attr));
};

/**
 * Create an SVG sprite from a list of symbols.
 *
 * @param {Array<string>} symbols - The list of SVG symbols.
 * @returns {string} The SVG sprite as a string.
 */
const createSvgSprite = (symbols: Array<string>, styles: Array<string>): string => {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0">',
    '<defs>',
    ...symbols.filter(Boolean),
    '</defs>',
    ...styles.filter(Boolean),
    '</svg>',
  ].join('\n');
};

/**
 * Generates icon types and exports them as a TypeScript module.
 * 
 * @param names - An array of icon names.
 * @param outputPath - The path where the generated TypeScript module will be saved.
 */
const generateTypes = async ({ names, outputPath, namespace }: GenerateTypeProps) => {

  const output = [
    '// This file is generated by spriteify',
    '',
    `export type ${namespace ? `${toTitleCase(namespace)}IconName` : 'IconName'} =`,
    ...names.map((name) => ` | "${name}"`),
    '',
    `export const ${namespace ? `${toTitleCase(namespace)}IconNames` : 'iconNames'} = [`,
    ...names.map((name) => ` "${name}",`),
    '] as const',
    '',
  ].join('\n');

  await writeIfChanged(outputPath, output, `${chalk.blueBright('TS')} Generated icon types in ${chalk.green(outputPath)}`);
};
