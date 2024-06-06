import chalk from 'chalk';
import { mkdir, readFile } from 'fs/promises';
import { glob } from 'glob';
import { parse } from 'node-html-parser';
import path from 'path';
import { optimize } from 'svgo';
import { logger } from './logger';
import { GenerateSpriteProps, GenerateTypeProps, PluginProps } from "./types";
import { toCamelCase, toTitleCase, writeIfChanged } from './utils';

export const generateIcons = async ({
  inputDir,
  outputDir,
  grouped,
  cwd,
  withTypes = false,
  fileName = 'sprite.svg',
  typeFileName = 'types.ts',
  optimize = false,
  svgoConfig,
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
        optimize,
        svgoConfig,
      });
      if (withTypes) {
        await generateTypes({
          names: groupedFiles[groupDir].map((file) => toCamelCase(file.replace(/\.svg$/, ''))),
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
      optimize,
      svgoConfig,
    });
    if (withTypes) {
      await generateTypes({
        names: files.map((file) => toCamelCase(file.replace(/\.svg$/, ''))),
        outputPath: path.join(outputDir, typeFileName),
      });
    }
  }
};

const generateSvgSprite = async (props: GenerateSpriteProps): Promise<void> => {
  const { files, inputDir, outputPath, outputDirRelative } = props;
  try {
    const processed = await Promise.all(files.map(file => processSvgFile(file, inputDir, props.optimize, props.svgoConfig)));

    const { symbols, defs, styles } = processed.reduce((acc, { symbol, defs, styles }) => {
      acc.symbols.push(symbol);
      acc.defs.push(...defs);
      acc.styles.push(styles);
      return acc;
    }, { symbols: [] as Array<string>, defs: [] as Array<string>, styles: [] as Array<string> });

    // Deduplicate defs
    const uniqueDefs = Array.from(new Set(defs));

    const output = createSvgSprite(symbols, uniqueDefs, styles);

    await writeIfChanged(outputPath, output, `🖼️  Generated SVG spritesheet in ${chalk.green(outputDirRelative)}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error generating SVG spritesheet: ${error.message}`);
    }
  }
};

const processSvgFile = async (file: string, inputDir: string, optimise?: boolean, options?: Record<string, any>): Promise<{ symbol: string, defs: string[], styles: string; }> => {
  try {
    const fileName = toCamelCase(file.replace(/\.svg$/, ''));
    let input = await readFile(path.join(inputDir, file), 'utf8');
    if (optimise) {
      const optimizedSvg = optimize(input, { path: path.join(inputDir, file), ...options });
      input = optimizedSvg.data;
    }
    
    const root = parse(input);
    const svg = root.querySelector('svg');

    if (!svg) {
      throw new Error(`No SVG tag found.`);
    }

    svg.tagName = 'symbol';
    svg.setAttribute('id', fileName);

    removeAttributes(svg as any, ['xmlns', 'xmlns:xlink', 'version', 'width', 'height']);

    const defs = svg.querySelector('defs');
    const defNodes = defs ? defs.childNodes.map(child => child.toString()) : [];

    if (defs) {
      defs.remove();
    }

    const styles = root.querySelectorAll('style').map((style) => style.toString());

    // remove style tags from the svg
    root.querySelectorAll('style').forEach((style) => style.remove());

    return { symbol: svg.toString(), defs: defNodes, styles: styles.join('\n') };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error processing ${file}: ${error.message}`);
    }
    return { symbol: '', defs: [], styles: '' };
  }
};

const removeAttributes = (svg: HTMLElement, attributes: Array<string>): void => {
  attributes.forEach(attr => svg.removeAttribute(attr));
};

const createSvgSprite = (symbols: Array<string>, defs: Array<string>, styles: Array<string>): string => {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0">',
    '<defs>',
    ...defs.filter(Boolean),
    '</defs>',
    '<style>',
    ...styles.filter(Boolean),
    '</style>',
    ...symbols.filter(Boolean),
    '</svg>',
  ].join('\n');
};

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
