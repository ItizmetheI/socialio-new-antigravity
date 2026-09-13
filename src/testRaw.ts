async function testRaw() {
  const res = await fetch("https://cdn-cf-east.streamable.com/video/mp4/a69bm3.mp4");
  console.log(res.status);
}
testRaw();
