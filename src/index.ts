import Debug from 'debug';
import getEtag from 'etag';
import path from 'path';
import type { PluginOption } from 'vite';
import { normalizePath } from 'vite';

import { generateIcons } from './generateIcons';
import { FileStats, PluginProps } from './types';
import { createModuleCode } from './utils/moduleCode';
import { debounce } from './utils/debounce';

const debug = Debug('vite-plugin-spriteify');

/**
 * Main function to create the spriteify plugin.
 */
export function spriteify(options: PluginProps) {
  const {
    inputDir,
    cwd,
    svgoConfig,
    inject = 'body-last',
    customDomId = '__svg__icons__dom__',
  } = options;

  const cache = new Map<string, FileStats>();
  const inputPath = normalizePath(path.join(cwd ?? process.cwd(), inputDir));

  const debouncedGenerateIcons = debounce(async () => {
    await generateIcons({
      ...options,
      inject,
      customDomId,
      cache,
    });
  }, 300);

  return {
    name: 'vite-plugin-spriteify',
    apply(config) {
      return config.mode !== 'production';
    },

    /**
     * Handle file change events.
     */
    async watchChange(id, change) {

      const file = normalizePath(id);
      if (
        file.includes(inputPath) &&
        file.endsWith('.svg') &&
        ['create', 'update', 'delete'].includes(change.event)
      ) {
        debouncedGenerateIcons();
      }
    },

    /**
     * Setup watcher for file changes and handle injection during development.
     */
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = normalizePath(req.url ?? '');
        if (url.endsWith(`/@id/${customDomId}`)) {
          try {
            const { code } = await createModuleCode(
              cache,
              svgoConfig ?? {},
              {
                ...options,
                inject,
                customDomId,
              }
            );
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Etag', getEtag(code, { weak: true }));
            res.statusCode = 200;
            res.end(code);
            debug(`Served SVG sprite module for ${customDomId}`);
          } catch (error) {
            res.statusCode = 500;
            res.end(`Error generating SVG sprite: ${(error as Error).message}`);
            debug(`Error serving SVG sprite module: ${(error as Error).message}`);
          }
        } else {
          next();
        }
      });
    },
  } as PluginOption;
}
