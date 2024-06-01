import { access, readFile, writeFile } from 'fs/promises';
import { logger } from './logger';

export const toCamelCase = (fileName: string): string => {
  return fileName
    .split(/[-_]/)
    .map((word, index) => {
      if (index === 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
};

export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/gi, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export const writeIfChanged = async (filepath: string, newContent: string, message: string) => {
  try {
    await access(filepath);
    const currentContent = await readFile(filepath, 'utf8');
    if (currentContent !== newContent) {
      await writeFile(filepath, newContent, 'utf8');
      logger.log(message);
    }
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      await writeFile(filepath, newContent, 'utf8');
      logger.log(message);
    } else {
      logger.error(`Error accessing file ${filepath}: ${error}`);
    }
  }
};
