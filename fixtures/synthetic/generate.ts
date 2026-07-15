import { parseArgs } from 'node:util';
import fs from 'node:fs';

let nameCounter = 0;

const options = {
  files: {
    type: 'string',
  },
  linesPerFile: {
    type: 'string',
  },
} as const;

const {
  values,
} = parseArgs({ options });

function generateInterface() {
  let fieldCounter = 0;
  const fieldList = ['longblack', 'latte', 'cappuccino', 'mocha', 'magic', 'piccolo']
  const typeList = ['number', 'boolean', 'string']

  const fieldNType: string[] = []


  for (let i = 0; i < Math.random() * 5; i++) {
    const field = fieldList[Math.floor(Math.random() * fieldList.length)]
    const type = typeList[Math.floor(Math.random() * typeList.length)]
    fieldNType.push(`${field}${fieldCounter++} : ${type};`)
  }

  return `interface Interface${nameCounter++} { ${fieldNType.join('\n')} }`
}

function generateGeneric() {
  const functionNameList = ['Victoria', 'Queensland', 'NewSouthWales', 'Tasmania']
  const templateList = ['(x: T): T[] { return [x]; }', '(x: T): T { return x; }', '(x: T, y: T): T[] { return [x, y]; }']
  const functionName = functionNameList[Math.floor(Math.random() * functionNameList.length)]
  const template = templateList[Math.floor(Math.random() * templateList.length)]


  return `function ${functionName}${nameCounter++}<T>${template}`
}

function generateTSCode() {
  let tsCode = '';


  while (tsCode.split('\n').length < Number(values.linesPerFile)) {
    tsCode += generateInterface() + '\n';
    tsCode += generateGeneric() + '\n';
  }

  return tsCode;
}

function generateTSFile() {
  if (!values.files) return;
  if (!Number(values.files) || !Number(values.linesPerFile)) return;

  const fileLineCount = Number(values.files) * Number(values.linesPerFile)

  let folderName = 'small';
  if (fileLineCount > 100000) folderName = 'large'
  else if (fileLineCount > 10000) folderName = 'medium'

  const folderLocation = `fixtures/synthetic/${folderName}`

  if (!fs.existsSync(folderLocation)) {
    fs.mkdirSync(folderLocation);
    fs.writeFileSync(`${folderLocation}/tsconfig.json`, `{
      "compilerOptions": {},
      "include": ["*.ts"]
    }`)
  }

  for (let i = 0; i < Number(values.files); i++) {
    const tsCode = generateTSCode();
    try {
      fs.writeFileSync(`${folderLocation}/file_${i}.ts`, tsCode);
    } catch (e) {
      console.log('file write error:', e)
    }
  }
}

generateTSFile();
