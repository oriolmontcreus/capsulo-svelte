import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';

const MANIFEST_ID = 'virtual:capsule-manifest';

/**
 * The live previews render the real form-builder from `src/lib`, which expects the
 * main app around it: the capsule manifest (a virtual module the app's Vite plugin
 * builds from its pages) and the CMS API for uploads. The docs are static, so this
 * swaps both for in-browser stand-ins.
 */
export function previewMocksPlugin(appRoot: string): Plugin {
  const storageModule = path.join(appRoot, 'src/lib/form-builder/fields/FileUploadField/storage.ts');
  const previewsDir = path.dirname(fileURLToPath(import.meta.url));

  return {
    name: 'capsulo-docs:preview-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source === MANIFEST_ID) return normalizePath(path.join(previewsDir, 'mock-capsule-manifest.ts'));
      if (!importer || !source.endsWith('/storage')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && path.normalize(resolved.id) === path.normalize(storageModule)) {
        return normalizePath(path.join(previewsDir, 'mock-storage.ts'));
      }
      return null;
    },
  };
}
