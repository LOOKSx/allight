# All Light — ระบบควบคุมโคมไฟอัจฉริยะ (Angular & Golang)

แอปพลิเคชันระบบควบคุมโคมไฟอัจฉริยะ พัฒนาใหม่ด้วย **Angular (Frontend)** และ **Golang (Backend)** รองรับการควบคุมไฟ ปรับแสง บรรยากาศ ตั้งเวลา และเซ็นเซอร์แสงอัจฉริยะ

---

## 🛠️ สถาปัตยกรรมระบบ (Architecture)

### 1. Frontend: **Angular** (โฟลเดอร์ `frontend/`)
- พัฒนาด้วย **Angular** (Standalone Components, Signals, TypeScript)
- UI Dark Theme สไตล์ Smart Home มีระบบจำลองแสงเรืองแสงของโคมไฟตามสีและความสว่างแบบเรียลไทม์
- โหมดการทำงานครบถ้วน:
  - 🖐️ **ควบคุมเอง (Manual Mode)**: เปิด/ปิดไฟ, ปรับความสว่าง 0-100%, เลือกเฉดสี/อุณหภูมิสี (Warm White, Daylight, Cool White, RGB)
  - ⏰ **ตามเวลา (Schedule Mode)**: กำหนดเวลาเปิด-ปิดไฟอัตโนมัติ (เช่น 18:30 - 06:00 หรือพรีเซ็ต ทั้งคืน/ก่อนนอน)
  - ☀️ **ตามแสงสว่าง (Light Sensor Mode)**: มาตรวัดระดับแสง (Lux Meter) แบบเรียลไทม์ และระบบเปิดไฟอัตโนมัติเมื่อห้องมืด
  - ⚙️ **ตั้งค่าบอร์ด (Board Settings & WiFi)**: สแกนและตั้งค่า WiFi สำหรับบอร์ด ESP32, ปุ่มสวิตช์ฮาร์ดแวร์จำลอง, และรีเซ็ตระบบ
- เชื่อมต่อ API ด้วย `HttpClient` และรองรับสตรีมข้อมูลเรียลไทม์ผ่าน `Server-Sent Events (SSE)`

### 2. Backend: **Golang** (โฟลเดอร์ `backend/`)
- เซิร์ฟเวอร์ภาษา **Go** ประสิทธิภาพสูง ความเร็วสูง และใช้หน่วยความจำต่ำ
- จัดการสถานะโคมไฟ (Lamp State) แบบ Thread-Safe ด้วย Mutex
- จำลองเซ็นเซอร์วัดแสง (Ambient Lux Sensor Simulator)
- ให้บริการ REST API และ Server-Sent Events (SSE):
  - `GET  /api/status` : ดึงสถานะปัจจุบันของโคมไฟ
  - `POST /api/power`  : สลับหรือกำหนดสถานะ เปิด/ปิดไฟ
  - `POST /api/settings`: ปรับค่าความสว่าง, สี, โหมด, เวลา, เซ็นเซอร์
  - `GET  /api/wifi/scan`: สแกนเครือข่าย WiFi ใกล้เคียง
  - `POST /api/wifi/connect`: บันทึกและเชื่อมต่อเครือข่าย WiFi
  - `GET  /api/events` : สตรีมสถานะโคมไฟและเซ็นเซอร์แสงแบบเรียลไทม์ (SSE)
- ทำหน้าที่เป็น Web Server ให้บริการไฟล์คอมไพล์ของ Angular จาก `dist/` บนพอร์ตเดียว (ค่าเริ่มต้นพอร์ต 8080)

---

## 🚀 วิธีการเปิดใช้งาน (How to Run)

### วิธีที่ 1: รันด้วยไฟล์สคริปต์ (ง่ายที่สุด)
ดับเบิลคลิกที่ไฟล์ **`start.bat`** 
ระบบจะเปิดเซิร์ฟเวอร์ Golang และเปิดหน้าเว็บที่ `http://localhost:8080` ให้อัตโนมัติ

### วิธีที่ 2: รันผ่าน Terminal / Command Line
```bash
# คอมไพล์และรัน Backend ภาษา Go
go run ./backend/main.go
```
จากนั้นเปิดบราวเซอร์ไปที่ `http://localhost:8080`

### วิธีที่ 3: โหมดพัฒนา (Development Mode แยกส่วน)
หากต้องการแก้ไขโค้ดและดูผลทันที (Hot Reload):

1. **เปิด Backend (Go):**
   ```bash
   go run ./backend/main.go
   ```
2. **เปิด Frontend (Angular):**
   ```bash
   cd frontend
   npm start
   ```
   เข้าใช้งานที่ `http://localhost:4200`

---

## 📦 การ Build โปรเจกต์
หากต้องการคอมไพล์ Frontend และ Backend ใหม่ทั้งหมด:
```bash
npm run build
```
ระบบจะรัน `build.js` เพื่อคอมไพล์ Angular ไปไว้ที่ `dist/` และคอมไพล์ Go ออกมาเป็นไฟล์ `allight-server.exe`
