package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type ScheduleConfig struct {
	Enabled bool   `json:"enabled"`
	OnTime  string `json:"onTime"`
	OffTime string `json:"offTime"`
	Preset  string `json:"preset"` // "all-night", "bedtime", "custom"
}

type AmbientConfig struct {
	Enabled    bool   `json:"enabled"`
	CurrentLux int    `json:"currentLux"` // 0 - 100%
	Threshold  string `json:"threshold"`  // "pitch-black", "dusk", "dim", "slight"
	AutoSwitch bool   `json:"autoSwitch"`
}

type NetworkConfig struct {
	Status    string `json:"status"`    // "online", "connecting", "offline"
	Type      string `json:"type"`      // "wifi", "bluetooth"
	SSID      string `json:"ssid"`
	IPAddress string `json:"ipAddress"`
}

type LampState struct {
	Power      bool           `json:"power"`
	Brightness int            `json:"brightness"` // 0 - 100
	Color      string         `json:"color"`      // Hex "#ffb703"
	Mode       string         `json:"mode"`       // "manual", "schedule", "ambient"
	Schedule   ScheduleConfig `json:"schedule"`
	Ambient    AmbientConfig  `json:"ambient"`
	Network    NetworkConfig  `json:"network"`
	LastUpdate time.Time      `json:"lastUpdate"`
}

type App struct {
	mu         sync.RWMutex
	state      LampState
	subscribers map[chan LampState]struct{}
	subMu      sync.Mutex
}

func getLocalIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "127.0.0.1"
	}
	defer conn.Close()
	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

func NewApp() *App {
	localIP := getLocalIP()
	return &App{
		state: LampState{
			Power:      true,
			Brightness: 80,
			Color:      "#ffb703",
			Mode:       "manual",
			Schedule: ScheduleConfig{
				Enabled: false,
				OnTime:  "18:30",
				OffTime: "06:00",
				Preset:  "all-night",
			},
			Ambient: AmbientConfig{
				Enabled:    false,
				CurrentLux: 35,
				Threshold:  "dusk",
				AutoSwitch: true,
			},
			Network: NetworkConfig{
				Status:    "online",
				Type:      "wifi",
				SSID:      "AllLight-Home-2.4G",
				IPAddress: localIP,
			},
			LastUpdate: time.Now(),
		},
		subscribers: make(map[chan LampState]struct{}),
	}
}

func (a *App) Broadcast() {
	a.mu.RLock()
	st := a.state
	a.mu.RUnlock()

	a.subMu.Lock()
	defer a.subMu.Unlock()
	for ch := range a.subscribers {
		select {
		case ch <- st:
		default:
		}
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	a.mu.RLock()
	defer a.mu.RUnlock()
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(a.state)
}

func (a *App) handlePower(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Power *bool `json:"power,omitempty"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	a.mu.Lock()
	if req.Power != nil {
		a.state.Power = *req.Power
	} else {
		a.state.Power = !a.state.Power
	}
	a.state.LastUpdate = time.Now()
	a.mu.Unlock()

	a.Broadcast()
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	a.mu.RLock()
	json.NewEncoder(w).Encode(a.state)
	a.mu.RUnlock()
}

func (a *App) handleSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Brightness *int            `json:"brightness,omitempty"`
		Color      *string         `json:"color,omitempty"`
		Mode       *string         `json:"mode,omitempty"`
		Schedule   *ScheduleConfig `json:"schedule,omitempty"`
		Ambient    *AmbientConfig  `json:"ambient,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	a.mu.Lock()
	if req.Brightness != nil {
		b := *req.Brightness
		if b < 0 {
			b = 0
		}
		if b > 100 {
			b = 100
		}
		a.state.Brightness = b
	}
	if req.Color != nil && *req.Color != "" {
		a.state.Color = *req.Color
	}
	if req.Mode != nil && *req.Mode != "" {
		a.state.Mode = *req.Mode
	}
	if req.Schedule != nil {
		a.state.Schedule = *req.Schedule
	}
	if req.Ambient != nil {
		a.state.Ambient.Enabled = req.Ambient.Enabled
		a.state.Ambient.Threshold = req.Ambient.Threshold
		a.state.Ambient.AutoSwitch = req.Ambient.AutoSwitch
	}
	a.state.LastUpdate = time.Now()
	a.mu.Unlock()

	a.Broadcast()
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	a.mu.RLock()
	json.NewEncoder(w).Encode(a.state)
	a.mu.RUnlock()
}

func (a *App) handleWifiScan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	networks := []map[string]interface{}{
		{"ssid": "AllLight-Home-2.4G", "signal": 95, "secured": true},
		{"ssid": "LivingRoom_Ultra_WiFi", "signal": 80, "secured": true},
		{"ssid": "IoT_Smart_Network", "signal": 70, "secured": true},
		{"ssid": "Neighbor_Guest", "signal": 45, "secured": false},
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"networks": networks,
	})
}

func (a *App) handleWifiConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		SSID     string `json:"ssid"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	a.mu.Lock()
	a.state.Network.SSID = req.SSID
	a.state.Network.Status = "online"
	a.state.Network.Type = "wifi"
	a.state.LastUpdate = time.Now()
	a.mu.Unlock()

	a.Broadcast()
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("เชื่อมต่อกับเครือข่าย %s สำเร็จ", req.SSID),
		"network": a.state.Network,
	})
}

func (a *App) handleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := make(chan LampState, 10)
	a.subMu.Lock()
	a.subscribers[ch] = struct{}{}
	a.subMu.Unlock()

	defer func() {
		a.subMu.Lock()
		delete(a.subscribers, ch)
		close(ch)
		a.subMu.Unlock()
	}()

	// Send current state immediately
	a.mu.RLock()
	initJSON, _ := json.Marshal(a.state)
	a.mu.RUnlock()
	fmt.Fprintf(w, "data: %s\n\n", initJSON)
	flusher.Flush()

	for {
		select {
		case <-r.Context().Done():
			return
		case st := <-ch:
			data, err := json.Marshal(st)
			if err == nil {
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// Background simulator for ambient sensor readings
func (a *App) startSimulator() {
	ticker := time.NewTicker(4 * time.Second)
	go func() {
		for range ticker.C {
			a.mu.Lock()
			// fluctuate ambient lux slightly
			diff := rand.Intn(7) - 3
			lux := a.state.Ambient.CurrentLux + diff
			if lux < 5 {
				lux = 5
			}
			if lux > 95 {
				lux = 95
			}
			a.state.Ambient.CurrentLux = lux

			// If ambient auto mode is active
			if a.state.Mode == "ambient" && a.state.Ambient.Enabled {
				thresholdVal := 40
				switch a.state.Ambient.Threshold {
				case "pitch-black":
					thresholdVal = 15
				case "dusk":
					thresholdVal = 35
				case "dim":
					thresholdVal = 55
				case "slight":
					thresholdVal = 75
				}
				shouldPowerOn := lux <= thresholdVal
				if a.state.Power != shouldPowerOn {
					a.state.Power = shouldPowerOn
				}
			}
			a.mu.Unlock()
			a.Broadcast()
		}
	}()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	app := NewApp()
	app.startSimulator()

	mux := http.NewServeMux()

	// API Routes
	mux.HandleFunc("/api/status", app.handleStatus)
	mux.HandleFunc("/api/power", app.handlePower)
	mux.HandleFunc("/api/settings", app.handleSettings)
	mux.HandleFunc("/api/wifi/scan", app.handleWifiScan)
	mux.HandleFunc("/api/wifi/connect", app.handleWifiConnect)
	mux.HandleFunc("/api/events", app.handleSSE)

	// Static Frontend Serving (fallback for Angular SPA)
	// Check possible frontend dist folders
	distCandidates := []string{
		filepath.Join(".", "dist"),
		filepath.Join(".", "frontend", "dist", "frontend", "browser"),
		filepath.Join("..", "frontend", "dist", "frontend", "browser"),
		filepath.Join(".", "frontend", "dist", "browser"),
	}

	var staticDir string
	for _, cand := range distCandidates {
		if fi, err := os.Stat(cand); err == nil && fi.IsDir() {
			staticDir = cand
			break
		}
	}

	if staticDir != "" {
		log.Printf("Serving static frontend from: %s", staticDir)
		fileServer := http.FileServer(http.Dir(staticDir))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}
			filePath := filepath.Join(staticDir, r.URL.Path)
			if fi, err := os.Stat(filePath); err != nil || fi.IsDir() {
				// Fallback to index.html for Angular SPA routing
				http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, r)
		})
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			fmt.Fprintf(w, "<h1>All Light Golang Backend Running</h1><p>API available at <a href='/api/status'>/api/status</a></p>")
		})
	}

	handler := enableCORS(mux)

	addr := ":" + port
	localIP := getLocalIP()

	fmt.Println("==================================================")
	fmt.Printf("  💡 All Light - Golang & Angular Web App Running!\n")
	fmt.Printf("  💻 เครื่องนี้ (Local):   http://localhost%s\n", addr)
	fmt.Printf("  📱 มือถือในบ้าน (LAN):   http://%s%s\n", localIP, addr)
	fmt.Printf("  ⚡ API Status:          http://localhost%s/api/status\n", addr)
	fmt.Println("==================================================")
	fmt.Println("  (เปิดใช้งานได้ทุกอุปกรณ์ในบ้าน ไม่จำกัด)")
	fmt.Println("  กด Ctrl + C เพื่อปิดเซิร์ฟเวอร์")

	go func() {
		time.Sleep(600 * time.Millisecond)
		_ = exec.Command("cmd", "/c", "start", fmt.Sprintf("http://localhost:%s", port)).Start()
	}()

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
