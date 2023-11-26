import fs from 'fs';

 const extractGlyphMapFromCodepoints = (fileName: string) => {
   const codepoints = fs
     .readFileSync(fileName, { encoding: 'utf8' })
     .split('\n');

   const glyphMap: Record<string, number> = {};

   codepoints.forEach((point) => {
     const parts = point.split(' ');
     if (parts[0] && parts[1]) {
       glyphMap[parts[0].replace(/_/g, '-')] = parseInt(parts[1], 16);
     }
   });

   return glyphMap;
 }

const extractGlyphMapFromCss = (files: string[], selectorPattern: string) => {
  const styleRulePattern =
    '(\\.[A-Za-z0-9_.:, \\n\\t-]+)\\{[^}]*content: ?["\\\'](?:\\\\([A-Fa-f0-9]+)|([^"\\\']+))["\\\'][^}]*\\}';
  const allStyleRules = new RegExp(styleRulePattern, 'g');
  const singleStyleRules = new RegExp(styleRulePattern);
  const allSelectors = new RegExp(selectorPattern, 'g');
  const singleSelector = new RegExp(selectorPattern);

  const extractGlyphFromRule = (rule: string) => {
    const ruleParts = rule.match(singleStyleRules);
    if (!ruleParts) {
      // NOTE: This should be impossible
      throw 'WTF: unpossible';
    }

    if (ruleParts[2]) {
      // Hex value in CSS
      return parseInt(ruleParts[2], 16);
    }

    if (!ruleParts[3]) {
      // NOTE: This should be impossible
      throw 'WTF: unpossible no ruleParts[3]';
    }

    if (ruleParts[3].length > 1) {
      // String value in CSS that we'll keep as a string because it's not a single character
      return ruleParts[3];
    }

    // String value in CSS that we'll convert to a charcode
    return ruleParts[3].charCodeAt(0);
  };

  const extractSelectorsFromRule = (rule: string) => {
    const ruleParts = rule.match(singleStyleRules);
    if (!ruleParts) {
      // NOTE: This should be impossible
      throw 'WTF: unpossible';
    }

    const selectors = ruleParts[1]?.match(allSelectors) || [];
    return selectors.map((selector) => selector.match(singleSelector)?.[1]);
  };

  return files
    .map((fileName) => fs.readFileSync(fileName, { encoding: 'utf8' }))
    .map((contents) => contents.match(allStyleRules) || [])
    .reduce((acc: string[], rules) => acc.concat(rules), [])
    .map((rule) => {
      const glyph = extractGlyphFromRule(rule);
      const selectors = extractSelectorsFromRule(rule);
      return selectors.map((selector) => [selector, glyph]);
    })
    .reduce(
      (acc, glyphs) => Object.assign(acc, Object.fromEntries(glyphs)),
      {}
    );
};

const escapeRegExp = (str: string) =>
  str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');

export const generateIconSetFromCss = (
  cssFiles: string[],
  selectorPrefix: string,
  mode: 'css' | 'codepoints' = 'css',
  template?: string,
  data = {}
) => {
  const glyphMap = mode === 'css' ? extractGlyphMapFromCss(
    cssFiles,
    `${escapeRegExp(selectorPrefix)}([A-Za-z0-9_-]+)::?before`
  ) : extractGlyphMapFromCodepoints(cssFiles[0]!);

  const content = JSON.stringify(glyphMap, null, '  ');

  if (template) {
    const templateVariables = { glyphMap: content, ...data } as Record<
      string,
      string
    >;

    return template.replace(/\${([^}]*)}/g, (_, key) => {
      const value = templateVariables[key];
      if (!value) {
        throw `${key} in template ${template} not available`;
      }

      return value;
    });
  }

  return content;
};

export default generateIconSetFromCss;
