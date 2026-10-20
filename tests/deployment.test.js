import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { JSDOM } from 'jsdom';

test('static deployment loads all styles and modules beneath the project URL', async (context) => {
  const projectRoot = fileURLToPath(new URL('../', import.meta.url));
  const prefix = '/Inginerie_Financiara_ASE/';
  const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    const target = resolve(
      projectRoot,
      decodeURIComponent(pathname.slice(prefix.length)) || 'index.html',
    );
    const location = relative(projectRoot, target);
    if (location.startsWith('..') || isAbsolute(location)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': contentTypes[extname(target)] || 'text/plain' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  context.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const pageUrl = `http://127.0.0.1:${server.address().port}${prefix}`;
  const pageResponse = await fetch(pageUrl);
  assert.equal(pageResponse.status, 200);
  const dom = new JSDOM(await pageResponse.text(), { url: pageUrl });
  context.after(() => dom.window.close());
  const styles = [...dom.window.document.querySelectorAll('link[rel="stylesheet"]')];
  const scripts = [...dom.window.document.querySelectorAll('script[type="module"][src]')];
  assert.equal(styles.length, 1);
  assert.equal(scripts.length, 1);
  const queue = [
    ...styles.map((element) => element.href),
    ...scripts.map((element) => element.src),
  ];
  const visited = new Set();
  while (queue.length) {
    const resourceUrl = queue.shift();
    if (visited.has(resourceUrl)) continue;
    visited.add(resourceUrl);
    assert.ok(
      new URL(resourceUrl).pathname.startsWith(prefix),
      `${resourceUrl} escapes the project directory`,
    );
    const response = await fetch(resourceUrl);
    assert.equal(response.status, 200, resourceUrl);
    const content = await response.text();
    if (resourceUrl.endsWith('.css')) {
      assert.match(response.headers.get('content-type'), /text\/css/);
      for (const match of content.matchAll(/@import\s+['"]([^'"]+)['"]/g))
        queue.push(new URL(match[1], resourceUrl).href);
    } else {
      assert.match(response.headers.get('content-type'), /(?:text|application)\/javascript/);
      for (const match of content.matchAll(/^import\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/gm))
        queue.push(new URL(match[1], resourceUrl).href);
    }
  }
  assert.ok([...visited].filter((url) => url.endsWith('.css')).length >= 7);
  assert.ok([...visited].filter((url) => url.endsWith('.js')).length >= 30);
  assert.equal((await fetch(new URL('/src/styles/main.css', pageUrl))).status, 404);
});
