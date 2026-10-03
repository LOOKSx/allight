import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LampService } from './services/lamp.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly lampService = inject(LampService);
  readonly state = this.lampService.state;

  readonly activeTab = signal<'control' | 'schedule' | 'ambient' | 'settings'>('control');

  // Wifi connect modal/form state
  readonly selectedSsid = signal<string>('');
  readonly wifiPassword = signal<string>('');
  readonly connectionStatusMsg = signal<string>('');

  // Color presets
  readonly colorPresets = [
    { name: 'ส้มอบอุ่น (2700K)', hex: '#ff9e00' },
    { name: 'วอร์มโกลด์ (3000K)', hex: '#ffb703' },
    { name: 'เดย์ไลท์ (4000K)', hex: '#fff3b0' },
    { name: 'ขาวสว่าง (6500K)', hex: '#ffffff' },
    { name: 'ม่วงนีออน', hex: '#a855f7' },
    { name: 'ฟ้าน้ำทะเล', hex: '#00b4d8' },
    { name: 'เขียวมรกต', hex: '#10b981' },
    { name: 'แดงทไวไลท์', hex: '#e63946' }
  ];

  // Quick brightness
  readonly brightnessSteps = [25, 50, 75, 100];

  // Quick Schedule Presets
  readonly schedulePresets = [
    { label: 'ทั้งคืน', on: '18:00', off: '06:00', key: 'all-night' },
    { label: 'ก่อนนอน', on: '21:00', off: '23:30', key: 'bedtime' },
    { label: 'หัวค่ำ', on: '18:30', off: '22:00', key: 'evening' }
  ];

  // Ambient threshold presets
  readonly ambientThresholds = [
    { key: 'pitch-black', name: 'มืดสนิท', desc: 'ต้องมืดสนิทเท่านั้นถึงจะเปิด (< 15%)' },
    { key: 'dusk', name: 'หัวค่ำ', desc: 'เริ่มมืดก็เปิดทันที (< 35%)' },
    { key: 'dim', name: 'สลัว', desc: 'แสงน้อยปานกลาง (< 55%)' },
    { key: 'slight', name: 'มืดเล็กน้อย', desc: 'มืดเพียงเล็กน้อยก็เปิด (< 75%)' }
  ];

  // Computed glow effect
  readonly lampGlowStyle = computed(() => {
    const s = this.state();
    if (!s.power) {
      return {
        'background-color': '#1a1d24',
        'box-shadow': 'none',
        'border-color': 'rgba(255, 255, 255, 0.1)'
      };
    }
    const color = s.color || '#ffb703';
    const alpha = (s.brightness / 100) * 0.85;
    const blur = Math.max(15, (s.brightness / 100) * 80);
    const spread = Math.max(5, (s.brightness / 100) * 30);
    return {
      'background-color': color,
      'box-shadow': `0 0 ${blur}px ${spread}px ${color}, inset 0 0 25px rgba(255, 255, 255, 0.6)`,
      'border-color': 'rgba(255, 255, 255, 0.8)'
    };
  });

  // Power Switch Toggle
  togglePower() {
    this.lampService.togglePower();
  }

  // Brightness change
  onBrightnessChange(event: Event) {
    const val = Number((event.target as HTMLInputElement).value);
    this.lampService.setBrightness(val);
  }

  setBrightness(val: number) {
    this.lampService.setBrightness(val);
  }

  // Color selection
  selectColor(hex: string) {
    this.lampService.setColor(hex);
  }

  onCustomColor(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.lampService.setColor(val);
  }

  // Mode Selection
  setMode(mode: 'manual' | 'schedule' | 'ambient') {
    this.lampService.setMode(mode);
  }

  // Schedule Configuration
  toggleSchedule(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.lampService.updateSchedule({ enabled: checked });
  }

  applySchedulePreset(preset: { on: string; off: string; key: string }) {
    this.lampService.updateSchedule({
      enabled: true,
      onTime: preset.on,
      offTime: preset.off,
      preset: preset.key
    });
  }

  onScheduleTimeChange(type: 'on' | 'off', event: Event) {
    const val = (event.target as HTMLInputElement).value;
    if (type === 'on') {
      this.lampService.updateSchedule({ onTime: val });
    } else {
      this.lampService.updateSchedule({ offTime: val });
    }
  }

  // Ambient Configuration
  toggleAmbient(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.lampService.updateAmbient({ enabled: checked });
  }

  setAmbientThreshold(threshold: string) {
    this.lampService.updateAmbient({ threshold });
  }

  // WiFi scan & connect
  scanWifi() {
    this.lampService.scanWifi();
  }

  selectWifi(ssid: string) {
    this.selectedSsid.set(ssid);
    this.connectionStatusMsg.set('');
  }

  submitWifiConnect() {
    const ssid = this.selectedSsid();
    const pw = this.wifiPassword();
    if (!ssid) return;

    this.connectionStatusMsg.set(`กำลังเชื่อมต่อกับ "${ssid}"...`);
    this.lampService.connectWifi(ssid, pw).subscribe({
      next: (res) => {
        this.connectionStatusMsg.set(res.message);
        setTimeout(() => {
          this.connectionStatusMsg.set('');
          this.selectedSsid.set('');
          this.wifiPassword.set('');
        }, 3000);
      },
      error: () => {
        this.connectionStatusMsg.set('การเชื่อมต่อล้มเหลว โปรดลองใหม่อีกครั้ง');
      }
    });
  }

  // Simulate hardware push button on lamp base
  pressHardwareButton() {
    this.togglePower();
  }

  // Reset lamp state
  resetLamp() {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าโคมไฟทั้งหมดหรือไม่?')) {
      this.lampService.setBrightness(80);
      this.lampService.setColor('#ffb703');
      this.lampService.setMode('manual');
      this.lampService.updateSchedule({ enabled: false, onTime: '18:30', offTime: '06:00' });
      this.lampService.updateAmbient({ enabled: false, threshold: 'dusk' });
    }
  }
}
