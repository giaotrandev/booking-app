// // require('dotenv').config();
// const path = require('path');

// const nodeEnv = process.env.NODE_ENV || 'development';
// const isProduction = nodeEnv === 'production';
// const baseDir = isProduction ? 'dist' : './src';

// console.log(`Module Alias configured for ${nodeEnv} environment`);

// const paths = {
//     '#src': baseDir,
//     '#emails': `${baseDir}/emails`,
//     '#config': `${baseDir}/config`,
//     '#controllers': `${baseDir}/controllers`,
//     '#schemas': `${baseDir}/schemas`,
//     '#jobs': `${baseDir}/jobs`,
//     '#loaders': `${baseDir}/loaders`,
//     '#queues': `${baseDir}/queues`,
//     '#middlewares': `${baseDir}/middlewares`,
//     '#services': `${baseDir}/services`,
//     '#routes': `${baseDir}/routes`,
//     '#utils': `${baseDir}/utils`,
//     '#docs': `${baseDir}/docs`
// };
// // const paths = {
// //     '#src': path.join(__dirname, baseDir),
// //     '#emails': path.join(__dirname, `${baseDir}/emails`),
// //     '#config': path.join(__dirname, `${baseDir}/config`),
// //     '#controllers': path.join(__dirname, `${baseDir}/controllers`),
// //     '#schemas': path.join(__dirname, `${baseDir}/schemas`),
// //     '#jobs': path.join(__dirname, `${baseDir}/jobs`),
// //     '#loaders': path.join(__dirname, `${baseDir}/loaders`),
// //     '#queues': path.join(__dirname, `${baseDir}/queues`),
// //     '#middlewares': path.join(__dirname, `${baseDir}/middlewares`),
// //     '#services': path.join(__dirname, `${baseDir}/services`),
// //     '#routes': path.join(__dirname, `${baseDir}/routes`),
// //     '#utils': path.join(__dirname, `${baseDir}/utils`),
// //     '#docs': path.join(__dirname, `${baseDir}/docs`),
// //     '#seeds': path.join(__dirname, `${baseDir}/seeds`),
// //   };

// module.exports = paths;
import path from 'path';
import { config } from 'dotenv';
config();

export interface ModuleAliases {
  [key: string]: string;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const baseDir = isProduction ? __dirname : 'src';

console.log(`Module alias configured for ${nodeEnv} environment, base directory: ${baseDir}`);

export const moduleAliases: ModuleAliases = {
  '#src': baseDir,
  '#emails': path.join(baseDir, 'emails'),
  '#config': path.join(baseDir, 'config'),
  '#controllers': path.join(baseDir, 'controllers'),
  '#schemas': path.join(baseDir, 'schemas'),
  '#jobs': path.join(baseDir, 'jobs'),
  '#loaders': path.join(baseDir, 'loaders'),
  '#queues': path.join(baseDir, 'queues'),
  '#middlewares': path.join(baseDir, 'middlewares'),
  '#services': path.join(baseDir, 'services'),
  '#routes': path.join(baseDir, 'routes'),
  '#utils': path.join(baseDir, 'utils'),
  '#docs': path.join(baseDir, 'docs'),
};

export default moduleAliases;
