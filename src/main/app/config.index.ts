import { writeFile } from 'fs';

function trim(x) {
    return x ? x.replace(/^\s+|\s+$/gm, '') : '';
}

const isProd : boolean = trim(process.env.NODE_ENV) !== "development";
const targetPath = './src/environments/environment.ts';

console.log('Building environment: ' + process.env.NODE_ENV + '; isProd: ' + isProd);

const envConfigFile = `export const environment = {
  production: ${isProd},
  dataUrl: '${process.env.DATA_EXTERNAL_HOST}',
  apiIntUrl: '${process.env.API_INTERNAL_HOST}',
  apiExtUrl: '${process.env.API_EXTERNAL_HOST}'
};
`;

writeFile(targetPath, envConfigFile, 'utf8', (err) => {
  if (err) return console.error(err);
});
