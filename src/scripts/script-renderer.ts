import * as csv from 'csv';
import * as fs from 'fs';
import * as path from 'path';

const file = fs.readFileSync(path.resolve(__dirname, '../../', 'data.csv'));
const writeStream = fs.createWriteStream(
  path.resolve(__dirname, '../../', 'output.sql'),
  {
    encoding: 'utf-8',
    autoClose: true,
  },
);

csv
  .parse(file, { columns: false, trim: true })
  .pipe(
    csv.transform((record) => {
      return [
        `UPDATE users SET metadata = '{"type": "augmentlabs","referenceid": "${record[1]}"}' WHERE email = '${record[0].toLowerCase()}';`,
      ];
    }),
  )
  .pipe(csv.stringify())
  .pipe(writeStream);
