import { readArticles, writeArticles } from "../lib/articles-store.js";

const before = await readArticles();
await writeArticles([]);
const after = await readArticles();

console.log(`Cleared articles: ${before.length} -> ${after.length}`);
