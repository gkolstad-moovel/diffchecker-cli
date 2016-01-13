import fs from 'fs';
import path from 'path';

export const configPath = path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '/.diffchecker.json');
export const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : false;
