import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';

const MANIFEST_ID = 'virtual:capsule-manifest';

/** What the Capsulo integration generates from a site's files; the docs have no site. */
const CAPSULO_VIRTUAL_MODULES: Record<string, string> = {
  'virtual:capsulo/config': `export default ${JSON.stringify({ i18n: { locales: ['en'], defaultLocale: 'en' } })};`,
  'virtual:capsulo/capsules': 'export default {};',
  'virtual:capsulo/capsule-schemas': 'export default {};',
};

/**
 * The live previews render the real form-builder from the capsulo package, which expects
 * a site and the integration around it: the capsule manifest and the `virtual:capsulo/*`
 * modules (generated from the site's files) and the CMS API for uploads. The docs are
 * static, so this swaps them for in-browser stand-ins.
 */
export function previewMocksPlugin(frameworkSrc: string): Plugin {
  const storageModule = path.join(frameworkSrc, 'lib/form-builder/fields/FileUploadField/storage.ts');
  const previewsDir = path.dirname(fileURLToPath(import.meta.url));

  return {
    name: 'capsulo-docs:preview-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source === MANIFEST_ID) return normalizePath(path.join(previewsDir, 'mock-capsule-manifest.ts'));
      if (source === 'virtual:capsulo/globals-schema') return normalizePath(path.join(previewsDir, 'example-globals.schema.ts'));
      if (source in CAPSULO_VIRTUAL_MODULES) return `\0${source}`;
      if (!importer || !source.endsWith('/storage')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && path.normalize(resolved.id) === path.normalize(storageModule)) {
        return normalizePath(path.join(previewsDir, 'mock-storage.ts'));
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0virtual:capsulo/')) return CAPSULO_VIRTUAL_MODULES[id.slice(1)];
      return null;
    },
  };
}
