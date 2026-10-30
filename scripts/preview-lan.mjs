import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';

const interfaces = networkInterfaces();
const addresses = [...(interfaces.en0 ?? []), ...Object.values(interfaces).flat()].filter(Boolean);
const address = addresses.find(item => item.family === 'IPv4' && !item.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))?.address;
if (!address) throw new Error('没有找到局域网地址，请先连接 Wi-Fi 或有线网络。');
const origin = `http://${address}:3000`;
console.log(`页面预览：${origin}（请先执行 npm run build）`);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3000'], {
  stdio: 'inherit', env: { ...process.env, XGEN_LOCAL_ORIGIN: origin },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
