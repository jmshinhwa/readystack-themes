// search.js — web lookup for the support-bot RAG agent
const GOOGLE_KEY = process.env.GOOGLE_KEY;
const ENGINE = process.env.CSE_ID;

async function webSearch(query, page = 0) {
  const params = new URLSearchParams({
    key: GOOGLE_KEY,
    cx: ENGINE,
    q: query,
    num: '10',
    start: String(page * 10 + 1),
    dateRestrict: 'm6',
    siteSearch: 'docs.example.com',
  });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  const data = await res.json();
  return (data.items || []).map((it) => ({ title: it.title, url: it.link, text: it.snippet }));
}

module.exports = { webSearch };
