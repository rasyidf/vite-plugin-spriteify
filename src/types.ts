
export interface PluginProps {
  inputDir: string;
  outputDir: string;
  withTypes?: boolean;
  fileName?: string;
  typeFileName?: string;
  grouped?: boolean;
  cwd?: string;
  changeEvent?: string;
  optimize?: boolean;
  svgoConfig?: Record<string, any>;
}

export type GenerateTypeProps = {
  names: string[];
  outputPath: string;
  namespace?: string;
};

export type GenerateSpriteProps = {
  files: string[];
  inputDir: string;
  outputPath: string;
  outputDirRelative?: string;
  optimize?: boolean;
  svgoConfig?: Record<string, any>;
};