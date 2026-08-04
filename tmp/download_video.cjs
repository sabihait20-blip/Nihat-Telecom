const http = require('http');
const https = require('https');
const fs = require('fs');

const videoId = 'TZGWNH-iaHk';
const instances = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.f5.si',
  'https://inv.zoomerville.com',
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
  'https://inv-ygg.nadeko.net',
  'https://yewtu.be',
  'https://invidious.flokinet.to',
  'https://inv.tux.pizza',
  'https://inv.vern.cc'
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(6000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    });
    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
    req.setTimeout(8000, () => {
      req.destroy();
      fs.unlink(dest, () => {});
      reject(new Error('Timeout'));
    });
  });
}

async function start() {
  for (const instance of instances) {
    const apiUrl = `${instance}/api/v1/videos/${videoId}`;
    console.log(`Trying instance: ${apiUrl}`);
    try {
      const data = await fetchJson(apiUrl);
      if (data && data.formatStreams && data.formatStreams.length > 0) {
        const mp4Stream = data.formatStreams.find(s => s.container === 'mp4' || s.type.includes('mp4')) || data.formatStreams[0];
        if (mp4Stream && mp4Stream.url) {
          console.log(`Found direct stream URL: ${mp4Stream.url.substring(0, 60)}...`);
          console.log(`Downloading format: ${mp4Stream.quality} (${mp4Stream.container || 'unknown'})`);
          await downloadFile(mp4Stream.url, 'public/intro.mp4');
          console.log('Download complete!');
          
          const stats = fs.statSync('public/intro.mp4');
          console.log(`Saved file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
          if (stats.size > 100000) {
            console.log('Successfully downloaded a valid file!');
            return;
          } else {
            console.log('File size too small, trying next instance...');
          }
        }
      } else {
        console.log('No formatStreams available on this instance, trying next...');
      }
    } catch (err) {
      console.error(`Failed for ${instance}:`, err.message);
    }
  }
  console.error('All instances failed!');
  process.exit(1);
}

start();
