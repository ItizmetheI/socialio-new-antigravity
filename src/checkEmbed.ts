const urls = [
  'https://streamable.com/a69bm3',
  'https://streamable.com/30ffri',
  'https://streamable.com/e25yp1',
  'https://streamable.com/e3xzs4'
];

async function checkEmbed() {
  const res = await fetch("https://streamable.com/e/a69bm3");
  console.log(res.status, await res.text().then(t => t.slice(0, 100)));
}
checkEmbed();
