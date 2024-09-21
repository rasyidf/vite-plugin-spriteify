import type { Config } from 'svgo';

export interface FileStats {
  symbolId: string;
  code: string;
  hash: string;
  isDynamic: boolean;
}

export interface PluginProps {
  inputDir: string;
  outputDir: string;
  cwd?: string;
  svgoConfig?: Config;
  inject?: 'body-first' | 'body-last';
  customDomId?: string;
  withTypes?: boolean;
  formatter?: Formatter;
  pathToFormatterConfig?: string;
  fileName?: string;
  typeFileName?: string;
  iconNameTransformer?: (fileName: string) => string;
  optimize?: boolean;
  symbolId?: string;
  debug?: boolean;
}

export type Formatter = 'prettier' | "biome" | undefined;
