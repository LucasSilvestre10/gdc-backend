const fs = require("fs");
const path = require("path");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith(".js")) {
      fixFile(full);
    }
  }
}

function fixFile(file) {
  let s = fs.readFileSync(file, "utf8");
  // adiciona .js em imports relativos que não tenham extensão
  s = s.replace(
    /(from\s+|import\()(["'])(\.{1,2}[^"']+?)(["'])/g,
    (m, p1, q1, rel, q2) => {
      if (rel.endsWith("/") || /\.[a-zA-Z0-9]+$/.test(rel)) return m;
      return `${p1}${q1}${rel}.js${q2}`;
    }
  );
  s = s.replace(
    /import\(\s*(["'])(\.{1,2}[^"']+?)(["'])\s*\)/g,
    (m, q1, rel, q2) => {
      if (rel.endsWith("/") || /\.[a-zA-Z0-9]+$/.test(rel)) return m;
      return `import(${q1}${rel}.js${q2})`;
    }
  );
  fs.writeFileSync(file, s, "utf8");
}

const dist = path.join(__dirname, "..", "dist");
if (!fs.existsSync(dist)) {
  console.error("dist folder not found, run build first");
  process.exit(1);
}
walk(dist);
console.log("fix-dist-imports: imports fixed");
