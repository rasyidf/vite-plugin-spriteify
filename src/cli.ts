#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { generateIcons } from './generateIcons';
import { PluginProps, FileStats } from './types';
import { loadViteConfig } from './utils/loadViteConfig';
import { Plugin, PluginOption } from 'vite';

const version = require('../package.json').version;

const program = new Command();

program
  .name('spriteify')
  .description('CLI to generate SVG sprites and optional TypeScript types based on Vite config file, created by @rasyidf')
  .version(version);

program
  .command('build')
  .description('Generate SVG sprite and optional TypeScript types')
  .option('-c, --config <path>', 'Path to Vite config file', 'vite.config.ts')
  .action(async (options) => {
    const configPath = path.resolve(process.cwd(), options.config);

    if (!fs.existsSync(configPath)) {
      console.error(`❌  Vite configuration file not found at ${configPath}`);
      process.exit(1);
    }

    let viteConfig;
    try {
      viteConfig = await loadViteConfig(configPath);
    } catch (error) {
      console.error(`❌  Failed to load Vite configuration: ${(error as Error).message}`);
      process.exit(1);
    }

    // Extract spriteify plugin options from Vite config
    const spriteifyPlugin: Plugin<any> = viteConfig.plugins?.find(
      (plugin: any) => plugin.name === 'vite-plugin-spriteify'
    ) as Plugin<any> ?? undefined as any;

    if (!spriteifyPlugin) {
      console.error('❌  vite-plugin-spriteify not found in Vite configuration plugins.');
      process.exit(1);
    }

    const pluginOptions: PluginProps = spriteifyPlugin.options as unknown as PluginProps;

    // Resolve paths
    const resolvedInputDir = path.resolve(process.cwd(), pluginOptions.inputDir);
    const resolvedOutputDir = path.resolve(process.cwd(), pluginOptions.outputDir);
    const resolvedSvgoConfig = pluginOptions.svgoConfig;
    const resolvedFormatterConfig = pluginOptions.pathToFormatterConfig
      ? path.resolve(process.cwd(), pluginOptions.pathToFormatterConfig)
      : undefined;


    // Prepare PluginProps
    const optionsForGenerate = {
      inputDir: resolvedInputDir,
      outputDir: resolvedOutputDir,
      cwd: process.cwd(),
      svgoConfig: resolvedSvgoConfig,
      inject: pluginOptions.inject ?? 'body-last',
      customDomId: pluginOptions.customDomId ?? '__svg__icons__dom__',
      withTypes: pluginOptions.withTypes,
      formatter: pluginOptions.formatter,
      pathToFormatterConfig: resolvedFormatterConfig,
      fileName: pluginOptions.fileName,
      typeFileName: pluginOptions.typeFileName,
      iconNameTransformer: pluginOptions.iconNameTransformer,
      optimize: pluginOptions.optimize,
      symbolId: pluginOptions.symbolId,
    };

    // Initialize cache
    const cache = new Map<string, FileStats>();

    try {
      await generateIcons({
        ...optionsForGenerate,
        cache,
      });
      console.log(
        `✅  SVG sprite generated at ${resolvedOutputDir}/${optionsForGenerate.fileName ?? 'sprite.svg'}`
      );
      if (optionsForGenerate.withTypes) {
        console.log(
          `✅  Type definitions generated at ${resolvedOutputDir}/${optionsForGenerate.typeFileName ?? 'types.ts'}`
        );
      }
    } catch (error) {
      console.error(`❌  Error generating SVG sprite: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
