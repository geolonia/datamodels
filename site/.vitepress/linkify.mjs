// Bare URLs in the Markdown become links (markdown-it's linkify, with linkify-it).
// linkify-it counts any letter as part of a URL's path, and full-width
// punctuation is not one of its separators, so in Japanese text
// "（https://example.com/a）を参照" linked "https://example.com/a）を参照".
// Here the path ends before the first non-ASCII character, and the URL is then
// read again up to that point, so the usual rules still drop a trailing "." or ")".
// The host may still be non-ASCII (日本語.jp). A bare URL whose path has raw
// non-ASCII characters must be percent-encoded or written as [text](url).
// http: covers https: and ftp:, which linkify-it defines as its aliases.
export function endUrlsAtNonAscii(md) {
  md.linkify.add('http:', {
    validate(text, pos, self) {
      const re = self.re;
      // self.re is rebuilt whenever linkify-it compiles, so these are too.
      re.http_host ??= new RegExp(`^\\/\\/${re.src_auth}${re.src_host_port_strict}`, 'i');
      re.http_url ??= new RegExp(`^\\/\\/${re.src_auth}${re.src_host_port_strict}${re.src_path}`, 'i');
      const tail = text.slice(pos);
      const host = re.http_host.exec(tail);
      if (!host) return 0;
      const cut = tail.slice(host[0].length).search(/[^\x00-\x7f]/);
      const url = re.http_url.exec(cut < 0 ? tail : tail.slice(0, host[0].length + cut));
      return url ? url[0].length : 0;
    },
  });
}
