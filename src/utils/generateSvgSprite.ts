import Debug from 'debug';
import { promises as fs } from 'fs';
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
  cache: Map<string, FileStats>;
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
}: GenerateSvgSpriteOptions) => {
  const symbolPromises = files.map(async (file) => {
    const filePath = path.join(inputDir, file);
    const iconName = transformIconName(file, iconNameTransformer ?? fileNameToCamelCase);

    try {
      let content = await fs.readFile(filePath, 'utf8');

      if (enableOptimize && svgoConfig) {
        try {
          const optimized = optimize(content, { path: filePath, ...svgoConfig });
          content = optimized.data;
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

      // Modify SVG for sprite
      svg.tagName = 'symbol';
      svg.setAttribute('id', iconName);
      svg.removeAttribute('xmlns');
      svg.removeAttribute('width');
      svg.removeAttribute('height');

      const svgString = svg.toString().trim();
      cache.set(filePath, { symbolId: iconName, code: svgString });

      return svgString;
    } catch (error) {
      console.error(`❌  Failed to process ${file}: ${(error as Error).message}`);
      return null;
    }
  });

  const symbols = (await Promise.all(symbolPromises)).filter(Boolean) as string[];

  const svgContent = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">',
    '<defs>',
    ...symbols,
    '</defs>',
    '</svg>',
  ].join('\n');

  const formattedSvg = await formatContent(svgContent, formatter, pathToFormatterConfig, 'svg');
  await fs.writeFile(outputPath, formattedSvg, 'utf8');

  debug(`SVG sprite generated at ${outputPath}`);
};
