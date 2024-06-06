import path from 'path';
import type { Plugin } from 'vite';
import { normalizePath } from 'vite';
import { generateIcons } from './generateIcons';
import { PluginProps } from "./types";


export function spriteify({
  withTypes = true, inputDir, outputDir, fileName, typeFileName, grouped, cwd, optimize, svgoConfig
}: PluginProps): Plugin {
  return {
    name: 'spriteify',
    apply(config) {
      return config.mode === 'development';
    },

    async watchChange(file, type) {
      const inputPath = normalizePath(path.join(cwd ?? process.cwd(), inputDir));
      if (file.includes(inputPath) && file.endsWith('.svg') && ['create', 'update', 'delete'].includes(type.event)) {
        await generateIcons({
          withTypes,
          inputDir,
          outputDir,
          fileName,
          typeFileName,
          grouped,
          cwd,
          changeEvent: type.event,
          optimize,
          svgoConfig,
        });
      }
    },
    // async handleHotUpdate({ file }) {
    //   const inputPath = normalizePath(path.join(cwd ?? process.cwd(), inputDir));
    //   if (file.includes(inputPath) && file.endsWith('.svg')) {
    //     await generateIcons({
    //       withTypes,
    //       inputDir,
    //       outputDir,
    //       fileName,
    //       typeFileName,
    //       grouped,
    //       cwd,
    //     });
    //   }
    // },
  };
}


