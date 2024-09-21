import path from 'path';
import { FileStats, PluginProps } from './types';
import { generateSvgSprite } from './utils/generateSvgSprite';
import { fileNameToCamelCase, getSvgFiles, transformIconName } from './utils/svgUtils';
import { generateTypes } from './utils/typesUtils';

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
