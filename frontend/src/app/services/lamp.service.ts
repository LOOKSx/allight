import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LampState, WifiNetwork } from '../models/lamp.model';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LampService {
  private http = inject(HttpClient);
  
  // Base URL: empty string uses current domain, otherwise fallback to localhost:8080 during dev
  private baseUrl = window.location.port === '4200' ? 'http://localhost:8080' : '';

  // Initial State
  readonly state = signal<LampState>({
    power: true,
    brightness: 80,
    color: '#ffb703',
    mode: 'manual',
    schedule: {
      enabled: false,
      onTime: '18:30',
      offTime: '06:00',
      preset: 'all-night'
    },
    ambient: {
      enabled: false,
      currentLux: 35,
      threshold: 'dusk',
      autoSwitch: true
    },
    network: {
      status: 'online',
      type: 'wifi',
      ssid: 'AllLight-Home-2.4G',
      ipAddress: '192.168.1.188'
    }
  });

  readonly isSyncing = signal<boolean>(false);
  readonly availableNetworks = signal<WifiNetwork[]>([]);
  readonly isScanningWifi = signal<boolean>(false);
  private eventSource?: EventSource;

  constructor() {
    this.fetchStatus();
    this.initSSE();
  }

  fetchStatus() {
    this.isSyncing.set(true);
    this.http.get<LampState>(`${this.baseUrl}/api/status`)
      .pipe(
        catchError(err => {
          console.warn('Backend not reachable, using local state:', err);
          return of(this.state());
        })
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.state.set(res);
          }
          this.isSyncing.set(false);
        },
        error: () => this.isSyncing.set(false)
      });
  }

  togglePower(powerVal?: boolean) {
    const current = this.state();
    const newPower = powerVal !== undefined ? powerVal : !current.power;
    
    // Optimistic update
    this.state.update(s => ({ ...s, power: newPower }));

    this.http.post<LampState>(`${this.baseUrl}/api/power`, { power: newPower })
      .pipe(catchError(() => of(this.state())))
      .subscribe(res => {
        if (res) this.state.set(res);
      });
  }

  setBrightness(val: number) {
    this.state.update(s => ({ ...s, brightness: val }));
    this.updateSettings({ brightness: val });
  }

  setColor(hex: string) {
    this.state.update(s => ({ ...s, color: hex }));
    this.updateSettings({ color: hex });
  }

  setMode(mode: 'manual' | 'schedule' | 'ambient') {
    this.state.update(s => ({ ...s, mode }));
    this.updateSettings({ mode });
  }

  updateSchedule(changes: Partial<LampState['schedule']>) {
    const current = this.state().schedule;
    const updated = { ...current, ...changes };
    this.state.update(s => ({ ...s, schedule: updated }));
    this.updateSettings({ schedule: updated });
  }

  updateAmbient(changes: Partial<LampState['ambient']>) {
    const current = this.state().ambient;
    const updated = { ...current, ...changes };
    this.state.update(s => ({ ...s, ambient: updated }));
    this.updateSettings({ ambient: updated });
  }

  scanWifi() {
    this.isScanningWifi.set(true);
    this.http.get<{ success: boolean; networks: WifiNetwork[] }>(`${this.baseUrl}/api/wifi/scan`)
      .pipe(
        catchError(() => of({
          success: true,
          networks: [
            { ssid: 'AllLight-Home-2.4G', signal: 95, secured: true },
            { ssid: 'LivingRoom_Ultra_WiFi', signal: 82, secured: true },
            { ssid: 'IoT_Smart_Mesh', signal: 68, secured: true },
            { ssid: 'Guest_Free_WiFi', signal: 40, secured: false }
          ]
        }))
      )
      .subscribe(res => {
        if (res && res.networks) {
          this.availableNetworks.set(res.networks);
        }
        this.isScanningWifi.set(false);
      });
  }

  connectWifi(ssid: string, password: string) {
    this.isSyncing.set(true);
    return this.http.post<{ success: boolean; message: string; network: any }>(
      `${this.baseUrl}/api/wifi/connect`,
      { ssid, password }
    ).pipe(
      catchError(() => {
        this.state.update(s => ({
          ...s,
          network: { ...s.network, ssid, status: 'online', type: 'wifi' }
        }));
        return of({ success: true, message: `เชื่อมต่อกับ ${ssid} แล้ว`, network: this.state().network });
      })
    );
  }

  private initSSE() {
    if (typeof EventSource !== 'undefined') {
      try {
        this.eventSource = new EventSource(`${this.baseUrl}/api/events`);
        this.eventSource.onmessage = (event) => {
          if (event.data) {
            try {
              const updatedState = JSON.parse(event.data);
              this.state.set(updatedState);
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        };
      } catch (err) {
        console.warn('SSE connection failed:', err);
      }
    }
  }
  
  private updateSettings(payload: any) {
    this.http.post<LampState>(`${this.baseUrl}/api/settings`, payload)
      .pipe(catchError(() => of(this.state())))
      .subscribe(res => {
        if (res) this.state.set(res);
      });
  }
}
