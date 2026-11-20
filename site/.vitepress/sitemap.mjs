// sitemap.xml: VitePress lists the ja and en version of each page as hreflang
// links. The pages themselves also name the English page as x-default (a reader
// of any other language gets it; config.ts, transformPageData). This adds the
// same x-default to the sitemap, so the two say the same thing.
// A page in one language only has no links and stays as it is.
export function addXDefault(items) {
  return items.map((item) => {
    const en = item.links?.find((link) => link.lang === 'en');
    return en ? { ...item, links: [...item.links, { lang: 'x-default', url: en.url }] } : item;
  });
}
