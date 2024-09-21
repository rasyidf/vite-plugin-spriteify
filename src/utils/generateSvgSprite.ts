// utils/generateSvgSprite.ts

import crypto from 'crypto';
import Debug from 'debug';
import { promises as fs } from 'fs';
import _ from 'lodash';
import { parse } from 'node-html-parser';
import path from 'path';
import { Config, optimize } from 'svgo';
import { FileStats, Formatter } from '../types';
import { formatContent } from './formatUtils';
import { fileNameToCamelCase, transformIconName } from './svgUtils';

const debug = Debug('vite-plugin-spriteify');

interface GenerateSvgSpriteOptions {
  files: string[];
  inputDir: string;
  outputPath: string;
  iconNameTransformer?: (fileName: string) => string;
  formatter?: Formatter;
  pathToFormatterConfig?: string;
  optimize: boolean;
  svgoConfig?: Config;
  changeEvent?: string;
  cache: Map<string, FileStats>;
  spriteOutputDir?: string; // Directory for sprite output
  debugLogging?: boolean; // Flag to enable detailed logging
}

export const generateSvgSprite = async ({
  files,
  inputDir,
  outputPath,
  iconNameTransformer,
  formatter,
  pathToFormatterConfig,
  optimize: enableOptimize,
  svgoConfig,
  cache,
  changeEvent,
  debugLogging = true,
}: GenerateSvgSpriteOptions) => {
  // Enable or disable debug logging based on the flag
  if (debugLogging) {
    Debug.enable('vite-plugin-spriteify');
  } else {
    Debug.disable();
  }

  // TODO: Handle deletion of SVG files
  if (changeEvent === "delete") { 
    cache.clear();
  }
  
  const symbolPromises = files.map(async (file) => {
    const filePath = path.join(inputDir, file);

    const iconName = transformIconName(file, iconNameTransformer ?? fileNameToCamelCase);

    try {
      let content = await fs.readFile(filePath, 'utf8');

      if (enableOptimize && svgoConfig) {
        try {
          const optimized = optimize(content, { path: filePath, ...svgoConfig });
          if ('data' in optimized) {
            content = optimized.data;
          } else {
            throw new Error('⚠️ SVGO optimization did not return data.');
          }
        } catch (error) {
          console.warn(`⚠️  SVGO optimization failed for ${file}: ${(error as Error).message}`);
          return null;
        }
      }

      const root = parse(content);
      const svg = root.querySelector('svg');
      if (!svg) {
        console.warn(`⚠️  No <svg> tag found in ${file}`);
        return null;
      }

      // Determine if the SVG is dynamic based on its content
      const dynamicSvgNodes = ['linearGradient', 'radialGradient', 'filter', 'clipPath'];
      const isDynamic = dynamicSvgNodes.some((node) => svg.innerHTML.includes(`<${node}`));

      // Generate a hash for the SVG to handle deduplication
      const hash = crypto
        .createHash('md5')
        .update(svg.toString().replace(/[ \n\t]/g, ''), 'utf8')
        .digest('hex')
        .slice(0, 8);

      const uniqueIconName = `${iconName}`;

      // Modify SVG for sprite
      svg.tagName = 'symbol';
      svg.setAttribute('id', uniqueIconName);
      svg.removeAttribute('xmlns');
      svg.removeAttribute('width');
      svg.removeAttribute('height');

      const svgString = svg.toString().trim();

      // check if the SVG is already in the cache
      if (cache.has(filePath)) {
        const { hash: cachedHash, symbolId } = cache.get(filePath) as FileStats;
        if (hash === cachedHash) {
          return { svgString, isDynamic, symbolId };
        }
      }

      // Store in cache
      cache.set(filePath, { hash, symbolId: uniqueIconName, code: svgString, isDynamic });

      return { svgString, isDynamic };
    } catch (error) {
      console.error(`❌  Failed to process ${file}: ${(error as Error).message}`);
      return null;
    }
  });


  const symbolsResults = (await Promise.all(symbolPromises)).filter(Boolean) as {
    svgString: string;
    isDynamic: boolean;
  }[];

  if (symbolsResults.length === 0) {
    console.warn('⚠️  No valid SVG symbols were generated.');
    return;
  }

  // Separate static and dynamic symbols
  const staticSymbols = symbolsResults
    .filter((item) => !item.isDynamic)
    .map((item) => item.svgString);

  const dynamicSymbols = symbolsResults
    .filter((item) => item.isDynamic)
    .map((item) => item.svgString);

  // Generate sprite content
  const spriteContentParts: string[] = [];

  // Optionally include XML declaration
  spriteContentParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  spriteContentParts.push('<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">');

  if (staticSymbols.length > 0) {
    spriteContentParts.push('<defs id="static-sprite-defs">');
    spriteContentParts.push(...staticSymbols);
    spriteContentParts.push('</defs>');
  }

  if (dynamicSymbols.length > 0) {
    spriteContentParts.push('<defs id="dynamic-sprite-defs">');
    spriteContentParts.push(...dynamicSymbols);
    spriteContentParts.push('</defs>');
  }

  spriteContentParts.push('</svg>');

  const svgContent = spriteContentParts.join('\n');

  // Format the SVG content if a formatter is provided
  const formattedSvg = await formatContent(svgContent, formatter, pathToFormatterConfig, 'svg');

  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write the sprite file
  await fs.writeFile(outputPath, formattedSvg, 'utf8');

  if (debugLogging) {
    debug(`SVG sprite generated at ${outputPath}`);
    debug(`Static symbols count: ${staticSymbols.length}`);
    debug(`Dynamic symbols count: ${dynamicSymbols.length}`);
  }

};
