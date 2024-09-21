import { UserConfig, loadConfigFromFile } from 'vite';
import path from 'path';

export const loadViteConfig = async (configPath: string): Promise<UserConfig & { plugins?: any[]; }> => {
  const resolvedPath = path.resolve(configPath);
  const {
    config = {},
  } = await loadConfigFromFile({ command: 'build', mode: 'production' }, resolvedPath) ?? {} as {
    path: string;
    config: UserConfig;
    dependencies: string[];
  };

  return config;
};
