// generateIcons.ts

import path from 'path';
import { PluginProps, FileStats } from './types';
import { getSvgFiles, transformIconName, fileNameToCamelCase } from './utils/svgUtils';
import { generateSvgSprite } from './utils/generateSvgSprite';
import { generateTypes } from './utils/typesUtils';
import { promises as fs } from 'fs';
import Debug from 'debug';

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
    changeEvent,
    iconNameTransformer = fileNameToCamelCase,
    optimize: enableOptimize,
    svgoConfig,
    cache,
  } = options;

  const baseDir = cwd ?? process.cwd();
  const inputDirRelative = path.relative(baseDir, inputDir);
  const spritePath = path.join(outputDir, fileName ?? 'sprite.svg');

  const spriteOutputDir = 'sprites'; // Adjust as needed
  const debugLogging = options.debug ?? false; // Assuming `debug` flag is part of PluginProps

  // Initialize the debug logger if debugging is enabled
  if (debugLogging) {
    Debug.enable('vite-plugin-spriteify');
  } else {
    Debug.disable();
  }

  const files = await getSvgFiles(inputDir);
  if (files.length === 0) {
    console.warn(`⚠️  No SVG files found in ${inputDirRelative}`);

    // Delete the sprite file if it exists
    try {
      await fs.unlink(spritePath);
      console.log(`✅  Deleted sprite file at ${spritePath}`);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File does not exist, no action needed
      } else {
        console.error(`❌  Failed to delete sprite file: ${err.message}`);
      }
    }

    // Optionally, delete the TypeScript types if they exist
    if (withTypes) {
      const typePath = path.join(outputDir, typeFileName ?? 'types.ts');
      try {
        await fs.unlink(typePath);
        console.log(`✅  Deleted type definitions at ${typePath}`);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File does not exist, no action needed
        } else {
          console.error(`❌  Failed to delete type definitions: ${err.message}`);
        }
      }
    }

    return;
  }

  try {
    await fs.mkdir(outputDir, { recursive: true });

    // Generate the SVG sprite with enhanced features
    await generateSvgSprite({
      files,
      inputDir,
      outputPath: spritePath,
      iconNameTransformer,
      formatter,
      pathToFormatterConfig,
      optimize: enableOptimize as boolean,
      svgoConfig,
      changeEvent, // Pass change event
      cache,
      spriteOutputDir, // Pass sprite output directory
      debugLogging, // Enable or disable detailed logging
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

    console.log(`✅  SVG sprite generated at ${spritePath}`);
    if (withTypes) {
      console.log(`✅  Type definitions generated at ${typeFileName ?? 'types.ts'}`);
    }

    // Optionally, log cache statistics or duplicates

    const duplicates = Array.from(cache.entries()).filter(([_, stats], index, self) => {
      return self.findIndex(([_, s]) => s.hash === stats.hash) !== index;
    });

    if (duplicates.length > 0) {
      console.warn(`⚠️  Found ${duplicates.length} duplicate SVGs based on hashes:`);

      duplicates.forEach(([filePath, stats], index) => {
        console.warn(`  ${index + 1}. Symbol ID: ${stats.symbolId}`);
        console.warn(`     File: ${path.relative(baseDir, filePath)}`);
      });

    }
  } catch (error) {
    console.error(`❌  Error generating icons: ${(error as Error).message}`);
  }
};
