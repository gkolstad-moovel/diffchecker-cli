import detect from 'charset-detector';
import fs from 'fs';

export default function getFile (path) {
  const supportedEncodings = ['ASCII', 'UTF-8', 'HEX', 'BASE64', 'UCS-2', 'UTF-16LE', 'UTF-8'];
  const buffer = fs.readFileSync(path);
  const encoding = detect(buffer);

  if (supportedEncodings.indexOf(encoding[0].charsetName) !== -1) {
    return fs.readFileSync(path, encoding[0].charsetName);
  } else {
    return fs.readFileSync(path, 'UTF-8');
  }
}
