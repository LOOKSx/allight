# All Light — ระบบควบคุมโคมไฟอัจฉริยะ

เว็บไซต์และแอปพลิเคชันคัดลอกมาจาก: `https://allight.vercel.app`

## โครงสร้างไฟล์
- `index.html` : หน้าเว็บหลัก
- `assets/` : สคริปต์ JavaScript และ CSS ของ React Application
  - `index-zv0WW0f4.js`
  - `index-JHRbltM0.css`
  - `workbox-window.prod.es5-Bd17z0YL.js`
- `favicon.svg` / `icons.svg` : ไอคอนและโลโก้ระบบ
- `manifest.webmanifest` : ไฟล์การตั้งค่า PWA
- `sw.js` / `workbox-835c8c05.js` : Service Worker สำหรับการทำงานแบบออฟไลน์
- `server.js` : ตัวเซิร์ฟเวอร์จำลองสำหรับรันบนเครื่อง Localhost (Node.js)
- `start.bat` : ดับเบิลคลิกเพื่อเปิดใช้งานเว็บทันที

## วิธีการเปิดใช้งาน
1. **วิธีที่ 1 (ง่ายที่สุด):** ดับเบิลคลิกที่ไฟล์ `start.bat` ตัวโปรแกรมจะรันเซิร์ฟเวอร์และเปิดบราวเซอร์ขึ้นมาที่ `http://localhost:3000` ให้อัตโนมัติ
2. **วิธีที่ 2:** เปิด Terminal หรือ PowerShell ในโฟลเดอร์นี้ แล้วพิมพ์:
   ```bash
   node server.js
   ```
   หรือ
   ```bash
   npm start
   ```
