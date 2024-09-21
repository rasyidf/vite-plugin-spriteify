import { promises as fs } from 'fs';
import { parse } from 'node-html-parser';
import path from 'path';
import { Config, optimize } from 'svgo';
import { FileStats, PluginProps } from '../types';
import { generateSvgSprite } from './generateSvgSprite';
import { createSymbolId, fileNameToCamelCase, getSvgFiles, transformIconName } from './svgUtils';
import { generateTypes } from './typesUtils';
 

/**
 * Generates the SVG sprite and optional TypeScript types.
 */
export const generateIcons = async (
  options: PluginProps & {
    changeEvent?: string;
    inject: 'body-first' | 'body-last';
    customDomId: string;
    cache: Map<string, FileStats>;
  }
) => {
  const {
    withTypes,
    inputDir,
    outputDir,
    cwd,
    formatter,
    pathToFormatterConfig,
    fileName,
    typeFileName,
    iconNameTransformer,
    optimize: enableOptimize,
    svgoConfig,
    cache,
  } = options;

  const baseDir = cwd ?? process.cwd();
  const inputDirRelative = path.relative(baseDir, inputDir);
  const outputDirRelative = path.relative(baseDir, outputDir);

  try {
    const files = await getSvgFiles(inputDir);
    if (files.length === 0) {
      console.warn(`⚠️  No SVG files found in ${inputDirRelative}`);
      return;
    }

    await fs.mkdir(outputDir, { recursive: true });

    await generateSvgSprite({
      files,
      inputDir,
      outputPath: path.join(outputDir, fileName ?? 'sprite.svg'),
      iconNameTransformer,
      formatter,
      pathToFormatterConfig,
      optimize: enableOptimize as boolean,
      svgoConfig,
      cache,
    });

    if (withTypes) {
      const iconNames = files.map((file) =>
        transformIconName(file, iconNameTransformer ?? fileNameToCamelCase)
      );
      await generateTypes({
        names: iconNames,
        outputPath: path.join(outputDir, typeFileName ?? 'types.ts'),
        formatter,
        pathToFormatterConfig,
      });
    }

    console.log(`✅  SVG sprite generated at ${outputDirRelative}`);
    if (withTypes) {
      console.log(`✅  Type definitions generated at ${typeFileName ?? 'types.ts'}`);
    }
  } catch (error) {
    console.error(`❌  Error generating icons: ${(error as Error).message}`);
  }
};

/**
 * Compiles icons into SVG symbols and aggregates them into HTML.
 */
export const compileIcons = async (
  cache: Map<string, FileStats>,
  svgOptions: Config,
  options: PluginProps & {
    iconDirs: string[];
  }
): Promise<{ insertHtml: string; }> => {
  const { iconDirs, optimize: enableOptimize } = options;
  let insertHtml = '';

  for (const dir of iconDirs) {
    const svgFiles = await getSvgFiles(dir);

    for (const file of svgFiles) {
      const filePath = path.join(dir, file);
      let stats = cache.get(filePath);

      if (!stats) {
        const symbolId = createSymbolId(file, options);
        const svgSymbol = await compileIcon(filePath, symbolId, svgOptions, enableOptimize as boolean);
        if (svgSymbol) {
          cache.set(filePath, { symbolId, code: svgSymbol });
          stats = { symbolId, code: svgSymbol };
        }
      }

      if (stats) {
        insertHtml += stats.code;
      }
    }
  }

  return { insertHtml };
};

/**
 * Optimizes and compiles a single SVG file into a symbol.
 */
const compileIcon = async (
  file: string,
  symbolId: string,
  svgOptions: Config,
  enableOptimize: boolean
): Promise<string | null> => {
  try {
    let content = await fs.readFile(file, 'utf8');

    if (enableOptimize && svgOptions) {
      try {
        const optimized = optimize(content, { path: file, ...svgOptions });
        content = optimized.data;
      } catch (error) {
        console.warn(`⚠️  SVGO optimization failed for ${file}: ${(error as Error).message}`);
        return null;
      }
    }

    content = content.replace(/stroke="[^"]*"/g, 'stroke="currentColor"');

    const root = parse(content);
    const svg = root.querySelector('svg');
    if (!svg) {
      console.warn(`⚠️  No <svg> tag found in ${file}`);
      return null;
    }

    svg.tagName = 'symbol';
    svg.setAttribute('id', symbolId);
    svg.removeAttribute('xmlns');
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    const svgSymbol = svg.toString().trim();

    return svgSymbol;
  } catch (error) {
    console.error(`❌  Failed to compile ${file}: ${(error as Error).message}`);
    return null;
  }
};
