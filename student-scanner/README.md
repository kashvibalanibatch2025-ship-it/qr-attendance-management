# 📱 Student QR Scanner Web App

> **Symbiosis Institute of Technology (SIT), Nagpur**  
> Companion Progressive Web Application (PWA) for the Teacher Attendance Portal.  
> Built according to the **`SCANNER_APP_SPEC.md`** single-source-of-truth specification.

---

## ✨ Features

- **Step 1: Student Verification**: Input student PRN / Roll Number (with quick-select pill buttons for seeded test students).
- **Step 2: Geolocation & Wi-Fi Check**:
  - Live campus geofencing check (`21.1255° N, 79.0522° E`).
  - **Dev Mode Bypass** checkbox for testing from home/dorm.
  - College Wi-Fi confirmation badge (`SYMBI_NGP_STUDENT`).
- **Step 3: Biometric Face Verification**:
  - Mirrored circular viewfinder with pulsing radar scan guide.
  - 2.5-second steady face visibility verification.
- **Step 4: Real-time QR Code Scanner**:
  - Powered by `html5-qrcode` using the laptop webcam or mobile cameras.
  - Automatic URL parsing and clean JWT token extraction (`http://.../scan/<token>` or raw tokens).
  - Front/Back camera flip toggle and image file upload fallback.
- **Step 5: Instant Real-time Synchronization**:
  - Submits payload to Backend API (`POST /api/attendance/scan`).
  - Instantly turns the student's status on the Teacher's screen from **Red "A" (Absent)** to **Green "P" (Present)** via WebSockets.
  - Web Audio API success chime and celebratory confetti animation.

---

## 🎨 Theme & Design System

Harmonized with the Teacher Attendance Portal's glassmorphic aesthetic:
- **Canvas Background:** `#fdf2f6` (Soft pastel pink)
- **Primary Accent:** `#EC77AB` (Hot pink)
- **Secondary Border:** `#D4C0F2` (Thistle lavender)
- **Text:** `#12122B` (Deep ink) & `#6B6B85` (Muted)
- **Status Badges:** `#16A34A` (Present / Green) & `#DC2626` (Error / Red)
- **Typography:** **Sora** (Headings), **IBM Plex Mono** (PRNs & Badges), **Inter** (Body)

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Verify `.env` has the backend URL:
```env
VITE_API_URL=http://localhost:10000
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

*(Or double-click `run-scanner.bat` on Windows)*

---

## 🧪 Pre-Seeded Students for Testing

| Section | Student PRN (Roll No) | Student Name |
| :--- | :--- | :--- |
| **Section A** | `25070521001` | ARUSHI VARGHESE |
| **Section A** | `25070521002` | LARANYA SHENDE |
| **Section A** | `25070521004` | HARSHINI S J |
| **Section B** | `25070521071` | PREETI GAUTAM |
| **Section C** | `25070521142` | ADITYA RAJ |

---

## 📦 Production Build

```bash
npm run build
```
Builds cleanly with **0 TypeScript and Vite bundle errors**.
