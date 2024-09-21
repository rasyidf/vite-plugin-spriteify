import { Config } from 'svgo';
import { FileStats, PluginProps } from '../types';
import { compileIcons } from './svg';

/**
 * Creates the JavaScript module code to inject the SVG sprite into the DOM.
 */
export const createModuleCode = async (
  cache: Map<string, FileStats>,
  svgoOptions: Config,
  options: PluginProps & {
    inject: 'body-first' | 'body-last';
    customDomId: string;
  }
): Promise<{ code: string; }> => {
  const { inject, customDomId, inputDir } = options;

  // Compile icons and generate HTML
  const { insertHtml } = await compileIcons(cache, svgoOptions, {
    ...options,
    iconDirs: [inputDir],
  });

  // Remove redundant xmlns attributes
  const xmlns = `xmlns="http://www.w3.org/2000/svg"`;
  const html = insertHtml.replace(new RegExp(xmlns, 'g'), '');

  // Generate the JavaScript code to inject the SVG sprite
  const code = `
    if (typeof window !== 'undefined') {
      function loadSvg() {
        var body = document.body;
        var svgDom = document.getElementById('${customDomId}');
        if (!svgDom) {
          svgDom = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgDom.style.position = 'absolute';
          svgDom.style.width = '0';
          svgDom.style.height = '0';
          svgDom.id = '${customDomId}';
          svgDom.setAttribute('aria-hidden', true);
        }
        svgDom.innerHTML = ${JSON.stringify(html)};
        ${domInject(inject)}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSvg);
      } else {
        loadSvg();
      }
    }
  `;

  return { code };
};

/**
 * Determines where to inject the SVG sprite in the DOM.
 */
const domInject = (inject: 'body-first' | 'body-last'): string => {
  return inject === 'body-first'
    ? 'body.insertBefore(svgDom, body.firstChild);'
    : 'body.appendChild(svgDom);';
};
