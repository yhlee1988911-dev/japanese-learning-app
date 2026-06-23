/**
 * 从 web/src/data/vocab-n*.ts 生成 web/public/questions/n*.json
 *
 * 用法: node scripts/generateQuestions.js
 * 输出: web/public/questions/n5.json ~ n1.json
 */

const fs = require('fs');
const path = require('path');

const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

const srcDir = path.resolve(__dirname, '../src/data');
const outDir = path.resolve(__dirname, '../public/questions');

// 确保输出目录存在
fs.mkdirSync(outDir, { recursive: true });

for (const level of levels) {
  const fileName = `vocab-${level.toLowerCase()}.ts`;
  const filePath = path.join(srcDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`[跳过] 未找到: ${filePath}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 提取 export const nXVocabulary: VocabularyItem[] = [...] 中的数组内容
  const match = content.match(/export\s+const\s+\w+\s*:\s*VocabularyItem\[\]\s*=\s*(\[[\s\S]*?\])\s*;/);

  if (!match) {
    console.error(`[失败] 无法解析 ${fileName} 中的数组`);
    continue;
  }

  try {
    // 用 eval 解析数组（安全，因为是本地生成脚本）
    const array = eval(match[1]);

    const outPath = path.join(outDir, `${level.toLowerCase()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(array, null, 2), 'utf-8');
    console.log(`[成功] ${level}: ${array.length} 条 → ${outPath}`);
  } catch (err) {
    console.error(`[失败] ${fileName}: ${err.message}`);
  }
}

console.log('\n全部生成完毕！');
