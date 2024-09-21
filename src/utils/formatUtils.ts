import prettier from 'prettier';
import { promises as fs } from 'fs';
import path from 'path';

import { Formatter } from '../types';

/**
 * Formats content using the specified formatter.
 */
export const formatContent = async (
  content: string,
  formatter?: Formatter,
  pathToFormatterConfig?: string,
  fileType: 'ts' | 'svg' = 'svg'
): Promise<string> => {
  if (!formatter) return content;

  try {
    const configPath = pathToFormatterConfig
      ? path.resolve(process.cwd(), pathToFormatterConfig)
      : undefined;
    const configContent = configPath
      ? await fs.readFile(configPath, 'utf8').catch(() => undefined)
      : undefined;
    const config = configContent ? JSON.parse(configContent) : {};

    const parser = fileType === 'ts' ? 'typescript' : 'html';

    return prettier.format(content, {
      parser,
      ...config,
    });
  } catch (error) {
    console.warn(`⚠️  Failed to format ${fileType} content: ${(error as Error).message}`);
    return content; // Return unformatted content on failure
  }
};
