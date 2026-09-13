import fs from "fs";

async function testCors() {
  const res = await fetch("https://streamable.com/a69bm3");
  console.log("CORS headers:", res.headers.get("access-control-allow-origin"));
}
testCors();
