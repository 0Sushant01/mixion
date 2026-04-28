#!/usr/bin/env python3
"""
Relay Dispense Controller - Pi side
Properly synchronized with ESP32 firmware protocol and state machine.

ESP32 Protocol Analysis:
- sendJSON() outputs JSON then newline (strict framing with \n)
- All relays activate in PARALLEL (not sequential)
- STEP_DONE sent when each relay's duration expires
- HEARTBEAT sent every 12 seconds
- CMD_TIMEOUT = 5s (VERIFIED must arrive within 5s)
- MAX_EXEC_TIME = 20s (total execution limit)
"""

import json
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk
import queue

import serial
import serial.tools.list_ports


# ================= CONFIG =================

CMD_TIMEOUT = 5000  # ms - ESP waits this long for VERIFIED
EXEC_TIMEOUT = 20000  # ms - ESP max execution time
HEARTBEAT_INTERVAL = 12000  # ms - ESP sends LIVE every 12s
HEARTBEAT_CHECK_INTERVAL = 15  # s - Pi checks heartbeat every 15s


# ================= SERIAL STATE =================

ser = None
running = False
rx_queue = queue.Queue(maxsize=200)

msg_id = 1
current_cmd = None
jobs = []
active_jobs = []

# State tracking
state = {
    "pi_state": "IDLE",          # Pi's view: IDLE, CMD_SENT, VERIFIED_SENT, RUNNING, DONE
    "esp_state": "IDLE",         # ESP's view (from responses): IDLE, WAITING_VERIFIED, IN_PROGRESS
    "run_started": None,         # When STARTED received
    "planned_total": 0,          # Sum of all relay durations
    "relays_done": set(),        # Which relays have finished
    "last_heartbeat": time.time(),  # Track LIVE messages
    "cmd_sent_time": None,       # When CMD was sent (for timeout check)
}

json_decoder = json.JSONDecoder()


# ================= UTIL =================

def log(msg, tag="INFO"):
    timestamp = time.strftime("%H:%M:%S")
    log_box.insert(tk.END, f"[{timestamp}] {msg}\n", tag)
    log_box.see(tk.END)


def list_ports():
    return [p.device for p in serial.tools.list_ports.comports()]


# ================= SERIAL WORKER =================

def serial_reader_thread():
    """Dedicated thread - read serial without blocking UI."""
    global running
    
    buffer = ""
    while running:
        try:
            if not ser or not ser.is_open:
                time.sleep(0.05)
                continue
            
            # Non-blocking read
            available = ser.in_waiting
            if available == 0:
                time.sleep(0.01)
                continue
            
            chunk = ser.read(available)
            text = chunk.decode("utf-8", errors="ignore")
            buffer += text
            
            # Extract lines (ESP sends \n as terminator)
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                
                if not line:
                    continue
                
                # Try to parse JSON
                try:
                    obj = json.loads(line)
                    try:
                        rx_queue.put_nowait(obj)
                    except queue.Full:
                        pass  # Drop if queue full
                except json.JSONDecodeError:
                    # Log corrupt but don't crash
                    try:
                        rx_queue.put_nowait({"_error": "JSON_DECODE", "_raw": line[:100]})
                    except queue.Full:
                        pass
        
        except Exception as e:
            log(f"Serial read exception: {e}", "ERR")
            time.sleep(0.1)


def process_rx_messages():
    """Poll queue and handle all pending messages."""
    while not rx_queue.empty():
        try:
            msg = rx_queue.get_nowait()
            
            if "_error" in msg:
                log(f"RX ERROR: {msg['_error']} - {msg.get('_raw', '')[:50]}", "ERR")
                continue
            
            # Log the message
            log("ESP -> PI : " + json.dumps(msg, separators=(",", ":")), "RX")
            
            # Handle by type
            handle_esp_response(msg)
        
        except queue.Empty:
            break


def handle_esp_response(resp):
    """Process response from ESP based on protocol."""
    global current_cmd, active_jobs, state
    
    msg_type = resp.get("type")
    
    # ========== ACK ==========
    if msg_type == "ACK":
        if state["pi_state"] != "CMD_SENT":
            log("ACK received in wrong state", "ERR")
            return
        
        # Verify jobs match
        if resp.get("jobs") != current_cmd["jobs"]:
            log("ACK jobs mismatch", "ERR")
            return
        
        log("ACK valid, sending VERIFIED", "INFO")
        state["pi_state"] = "VERIFIED_SENT"
        state["esp_state"] = "WAITING_VERIFIED"
        
        # Send VERIFIED immediately
        verified = {
            "type": "VERIFIED",
            "msg_id": current_cmd["msg_id"],
            "jobs": current_cmd["jobs"],
        }
        send_to_esp(verified)
    
    # ========== STARTED ==========
    elif msg_type == "STARTED":
        if state["pi_state"] not in ["VERIFIED_SENT", "RUNNING"]:
            log("STARTED in wrong state", "ERR")
            return
        
        # First STARTED - initialize run
        if state["pi_state"] == "VERIFIED_SENT":
            state["pi_state"] = "RUNNING"
            state["esp_state"] = "IN_PROGRESS"
            state["run_started"] = time.monotonic()
            state["relays_done"] = set()
            
            log("Execution started - all relays active (parallel)", "INFO")
            set_run_state("RUNNING", "IN_PROGRESS")
            status_relay_var.set(f"Running {len(active_jobs)} relay(s) in parallel")
            update_runtime_ui()
        else:
            # STARTED can be sent multiple times by ESP for reliability
            log("STARTED (duplicate/heartbeat)", "INFO")
    
    # ========== STEP_DONE ==========
    elif msg_type == "STEP_DONE":
        relay_num = resp.get("relay")
        
        if state["pi_state"] != "RUNNING":
            log(f"STEP_DONE {relay_num} but not running", "ERR")
            return
        
        state["relays_done"].add(relay_num)
        remaining = len(active_jobs) - len(state["relays_done"])
        
        # Find relay duration
        relay_job = None
        for j in active_jobs:
            if j["relay"] == relay_num:
                relay_job = j
                break
        
        if relay_job:
            elapsed = int(time.monotonic() - state["run_started"])
            expected = relay_job["duration"]
            drift = elapsed - expected
            
            if abs(drift) <= 1:
                log(f"Relay {relay_num} complete: {expected}s (OK)", "INFO")
            else:
                log(f"Relay {relay_num} complete: expected {expected}s, actual {elapsed}s (drift {drift:+d}s)", "ERR")
        
        status_relay_var.set(f"Relay {relay_num} done | {remaining} remaining")
    
    # ========== DONE ==========
    elif msg_type == "DONE":
        if state["pi_state"] != "RUNNING":
            log("DONE in wrong state", "ERR")
            return
        
        log("All relays done", "INFO")
        state["pi_state"] = "DONE"
        state["esp_state"] = "IDLE"
        set_run_state("DONE", "IDLE")
        status_relay_var.set("Execution complete")
        active_jobs = []
    
    # ========== DISCARDED ==========
    elif msg_type == "DISCARDED":
        log("ESP discarded command (verified timeout)", "ERR")
        state["pi_state"] = "IDLE"
        state["esp_state"] = "IDLE"
        set_run_state("ERROR", "IDLE")
        messagebox.showerror("Command Timeout", "ESP discarded command (VERIFIED not received in 5s)")
        active_jobs = []
    
    # ========== ERROR ==========
    elif msg_type == "ERROR":
        reason = resp.get("reason", "unknown")
        log(f"ESP error: {reason}", "ERR")
        state["pi_state"] = "IDLE"
        state["esp_state"] = "IDLE"
        set_run_state("ERROR", "IDLE")
        messagebox.showerror("ESP Error", f"Device error: {reason}")
        active_jobs = []
    
    # ========== BUSY ==========
    elif msg_type == "BUSY":
        log("ESP busy", "ERR")
        messagebox.showwarning("Device Busy", "ESP is busy, try again")
    
    # ========== LIVE (Heartbeat) ==========
    elif msg_type == "LIVE":
        state["last_heartbeat"] = time.time()
        log("HEARTBEAT received", "INFO")


# ================= SEND TO ESP =================

def send_to_esp(cmd):
    """Send JSON command to ESP with strict \\n framing."""
    if not ser or not ser.is_open:
        messagebox.showerror("Error", "Not connected to device")
        return False
    
    try:
        msg = json.dumps(cmd, separators=(",", ":"))
        log("PI -> ESP : " + msg, "TX")
        ser.write((msg + "\n").encode("utf-8"))
        ser.flush()
        return True
    except Exception as e:
        log(f"Send failed: {e}", "ERR")
        return False


# ================= UI STATE =================

def set_connection_state(connected, port=""):
    if connected:
        conn_var.set(f"Connected: {port}")
        conn_badge.config(text="CONNECTED", bg="#1f7a3a")
    else:
        conn_var.set("Disconnected")
        conn_badge.config(text="DISCONNECTED", bg="#7a1f27")


def set_run_state(pi_state_val, esp_state_val=None):
    state["pi_state"] = pi_state_val
    if esp_state_val is not None:
        state["esp_state"] = esp_state_val
    
    display = f"{pi_state_val}"
    if esp_state_val:
        display += f" / {esp_state_val}"
    status_main_var.set(display)
    
    # Update badge color
    if pi_state_val == "RUNNING":
        run_badge.config(text="RUNNING", bg="#1f7a3a")
    elif pi_state_val == "DONE":
        run_badge.config(text="DONE", bg="#2f5fa6")
    elif pi_state_val == "ERROR":
        run_badge.config(text="ERROR", bg="#8c2f1b")
    else:
        run_badge.config(text=pi_state_val, bg="#58616a")


def update_runtime_ui():
    """Update elapsed time during execution."""
    if state["pi_state"] != "RUNNING" or not state["run_started"]:
        return
    
    elapsed = int(time.monotonic() - state["run_started"])
    planned = state["planned_total"]
    status_total_var.set(f"Run elapsed: {elapsed}s / planned {planned}s")
    
    root.after(500, update_runtime_ui)


def monitor_heartbeat():
    """Check if heartbeat is being received."""
    now = time.time()
    since_hb = now - state["last_heartbeat"]
    
    # If connected and no heartbeat for 20s, send STATUS probe
    if ser and ser.is_open and since_hb > 20:
        log("No heartbeat for 20s, sending STATUS probe", "INFO")
        send_to_esp({"type": "STATUS", "msg_id": "heartbeat_probe"})
        state["last_heartbeat"] = now
    
    root.after(5000, monitor_heartbeat)


# ================= CONNECTION =================

def connect():
    global ser, running
    try:
        port = port_var.get()
        ser = serial.Serial(port, 115200, timeout=1)
        time.sleep(2)  # Let ESP reset
        
        running = True
        threading.Thread(target=serial_reader_thread, daemon=True).start()
        
        set_connection_state(True, port)
        state["last_heartbeat"] = time.time()
        log(f"Connected to {port}", "INFO")
    except Exception as exc:
        messagebox.showerror("Connection Error", str(exc))


def disconnect():
    global running
    running = False
    if ser and ser.is_open:
        ser.close()
    set_connection_state(False)
    set_run_state("IDLE")
    log("Disconnected", "INFO")


def refresh_ports():
    port_menu["values"] = list_ports()
    log("Ports refreshed", "INFO")


def test_status():
    send_to_esp({"type": "STATUS", "msg_id": "test"})


# ================= JOB BUILDER =================

def parse_float(value, field_name):
    try:
        v = float(value)
        if v <= 0:
            raise ValueError("must be > 0")
        return v
    except ValueError:
        raise ValueError(f"{field_name} invalid")


def parse_int(value, field_name):
    try:
        v = int(value)
        if v <= 0:
            raise ValueError("must be > 0")
        return v
    except ValueError:
        raise ValueError(f"{field_name} invalid")


def calc_duration(target_ml, capacity_ml_min):
    """Duration in seconds: (ml / ml_per_min) * 60"""
    return max(1, int(round((target_ml * 60.0) / capacity_ml_min)))


def update_preview(*_):
    try:
        target = parse_float(target_ml_var.get(), "Target")
        cap = parse_float(capacity_var.get(), "Capacity")
        dur = calc_duration(target, cap)
        duration_preview_var.set(f"{dur} s")
    except:
        duration_preview_var.set("-")


def refresh_jobs_view():
    for item in jobs_tree.get_children():
        jobs_tree.delete(item)
    
    total_ml = 0.0
    total_dur = 0
    for idx, job in enumerate(jobs, start=1):
        jobs_tree.insert("", tk.END, values=(
            idx, job["relay"], f"{job['target_ml']:.2f}",
            f"{job['capacity_ml_min']:.2f}", job["duration"]
        ))
        total_ml += job["target_ml"]
        total_dur += job["duration"]
    
    summary_var.set(
        f"Jobs: {len(jobs)} | Total ml: {total_ml:.2f} | Total duration: {total_dur}s"
    )


def add_job():
    try:
        relay = parse_int(relay_var.get(), "Relay")
        target_ml = parse_float(target_ml_var.get(), "Target ml")
        capacity_ml_min = parse_float(capacity_var.get(), "Capacity ml/min")
        duration = calc_duration(target_ml, capacity_ml_min)
        
        jobs.append({
            "relay": relay,
            "target_ml": target_ml,
            "capacity_ml_min": capacity_ml_min,
            "duration": duration,
        })
        refresh_jobs_view()
        log(f"Job added: relay={relay}, target={target_ml}ml, cap={capacity_ml_min}ml/min, dur={duration}s", "INFO")
    except Exception as e:
        messagebox.showerror("Error", str(e))


def remove_selected_job():
    selected = jobs_tree.selection()
    if not selected:
        messagebox.showerror("Error", "Select a job")
        return
    item = selected[0]
    idx = int(jobs_tree.item(item, "values")[0]) - 1
    removed = jobs.pop(idx)
    refresh_jobs_view()
    log(f"Removed relay {removed['relay']}", "INFO")


def clear_jobs():
    jobs.clear()
    refresh_jobs_view()
    log("Jobs cleared", "INFO")


def send_cmd():
    global msg_id, current_cmd, active_jobs
    
    if not ser or not ser.is_open:
        messagebox.showerror("Error", "Not connected")
        return
    
    if not jobs:
        messagebox.showerror("Error", "No jobs")
        return
    
    # Build payload (only relay + duration for ESP)
    payload = [{"relay": j["relay"], "duration": j["duration"]} for j in jobs]
    
    cmd = {"type": "CMD", "msg_id": str(msg_id), "jobs": payload}
    current_cmd = cmd
    active_jobs = [j.copy() for j in jobs]
    
    state["planned_total"] = sum(j["duration"] for j in jobs)
    state["pi_state"] = "CMD_SENT"
    state["esp_state"] = "WAITING_VERIFIED"
    state["cmd_sent_time"] = time.time()
    
    set_run_state("CMD_SENT", "WAITING_VERIFIED")
    
    if send_to_esp(cmd):
        jobs.clear()
        refresh_jobs_view()
        status_relay_var.set("Waiting for ACK...")
        log("CMD sent, clearing queue", "INFO")
        msg_id += 1
    else:
        state["pi_state"] = "IDLE"


# ================= MAIN LOOP =================

def main_loop():
    """Main UI loop - process messages and update."""
    process_rx_messages()
    root.after(100, main_loop)


# ================= UI SETUP =================

root = tk.Tk()
root.title("Relay Dispense Controller")
root.geometry("1160x820")
root.minsize(1020, 720)
root.configure(bg="#eef3f7")

style = ttk.Style(root)
style.theme_use("clam")
style.configure("App.TFrame", background="#eef3f7")
style.configure("Panel.TLabelframe", background="#f8fbff", borderwidth=1, relief="solid")
style.configure("Panel.TLabelframe.Label", background="#f8fbff", foreground="#16324f", font=("TkDefaultFont", 11, "bold"))
style.configure("Subtle.TLabel", background="#eef3f7", foreground="#4e6072")
style.configure("Primary.TButton", font=("TkDefaultFont", 10, "bold"))
style.configure("Accent.TButton", font=("TkDefaultFont", 10, "bold"))
style.map("Primary.TButton", background=[("!disabled", "#1f6feb")], foreground=[("!disabled", "white")])
style.map("Accent.TButton", background=[("!disabled", "#2b8a3e")], foreground=[("!disabled", "white")])
style.configure("Treeview", rowheight=28, font=("TkDefaultFont", 10))
style.configure("Treeview.Heading", font=("TkDefaultFont", 10, "bold"))

main = ttk.Frame(root, padding=10, style="App.TFrame")
main.pack(fill="both", expand=True)

# Header
header = tk.Frame(main, bg="#113a5c", bd=0)
header.pack(fill="x", pady=(0, 10))
title_wrap = tk.Frame(header, bg="#113a5c")
title_wrap.pack(side="left", padx=14, pady=10)
tk.Label(title_wrap, text="Relay Dispense Controller", bg="#113a5c", fg="#f4f8fc", font=("TkDefaultFont", 14, "bold")).pack(anchor="w")
tk.Label(title_wrap, text="Parallel relay execution with ml-based dispensing", bg="#113a5c", fg="#b7d1e8", font=("TkDefaultFont", 10)).pack(anchor="w")

conn_badge = tk.Label(header, text="DISCONNECTED", bg="#7a1f27", fg="white", padx=12, pady=6, font=("TkDefaultFont", 10, "bold"))
conn_badge.pack(side="right", padx=14, pady=12)

# Controls
controls = ttk.LabelFrame(main, text="Connection & Commands", padding=10, style="Panel.TLabelframe")
controls.pack(fill="x", pady=(0, 10))

port_var = tk.StringVar(value="/dev/ttyUSB0")
conn_var = tk.StringVar(value="Disconnected")

port_menu = ttk.Combobox(controls, textvariable=port_var, values=list_ports(), width=24)
port_menu.grid(row=0, column=0, padx=(0, 8), pady=(0, 8), sticky="w")

ttk.Button(controls, text="Refresh", command=refresh_ports).grid(row=0, column=1, padx=4, pady=(0, 8))
ttk.Button(controls, text="Connect", style="Primary.TButton", command=connect).grid(row=0, column=2, padx=4, pady=(0, 8))
ttk.Button(controls, text="Disconnect", command=disconnect).grid(row=0, column=3, padx=4, pady=(0, 8))
ttk.Button(controls, text="Send CMD", style="Accent.TButton", command=send_cmd).grid(row=0, column=4, padx=4, pady=(0, 8))
ttk.Button(controls, text="Test STATUS", command=test_status).grid(row=0, column=5, padx=4, pady=(0, 8))

ttk.Label(controls, textvariable=conn_var, style="Subtle.TLabel").grid(row=1, column=0, columnspan=6, sticky="w")

# Job Builder
builder = ttk.LabelFrame(main, text="Dispense Job Builder", padding=10, style="Panel.TLabelframe")
builder.pack(fill="x", pady=(0, 10))

relay_var = tk.StringVar(value="1")
target_ml_var = tk.StringVar(value="10")
capacity_var = tk.StringVar(value="120")
duration_preview_var = tk.StringVar(value="5 s")

ttk.Label(builder, text="Relay").grid(row=0, column=0, sticky="w")
ttk.Entry(builder, textvariable=relay_var, width=8).grid(row=1, column=0, padx=(0, 10), sticky="w")
ttk.Label(builder, text="Target (ml)").grid(row=0, column=1, sticky="w")
ttk.Entry(builder, textvariable=target_ml_var, width=14).grid(row=1, column=1, padx=(0, 10), sticky="w")
ttk.Label(builder, text="Capacity (ml/min)").grid(row=0, column=2, sticky="w")
ttk.Entry(builder, textvariable=capacity_var, width=14).grid(row=1, column=2, padx=(0, 10), sticky="w")
ttk.Label(builder, text="Duration").grid(row=0, column=3, sticky="w")
ttk.Label(builder, textvariable=duration_preview_var).grid(row=1, column=3, padx=(0, 10), sticky="w")
ttk.Button(builder, text="Add Job", style="Primary.TButton", command=add_job).grid(row=1, column=4, padx=(0, 6))
ttk.Button(builder, text="Remove", command=remove_selected_job).grid(row=1, column=5, padx=(0, 6))
ttk.Button(builder, text="Clear", command=clear_jobs).grid(row=1, column=6)

target_ml_var.trace_add("write", update_preview)
capacity_var.trace_add("write", update_preview)
update_preview()

# Content
content = ttk.Panedwindow(main, orient="horizontal")
content.pack(fill="both", expand=True)

left = ttk.Frame(content, style="App.TFrame")
right = ttk.Frame(content, style="App.TFrame")
content.add(left, weight=3)
content.add(right, weight=2)

jobs_frame = ttk.LabelFrame(left, text="Queued Jobs", padding=8, style="Panel.TLabelframe")
jobs_frame.pack(fill="both", expand=True)

cols = ("idx", "relay", "target_ml", "capacity", "duration")
jobs_tree = ttk.Treeview(jobs_frame, columns=cols, show="headings", height=10)
jobs_tree.heading("idx", text="#")
jobs_tree.heading("relay", text="Relay")
jobs_tree.heading("target_ml", text="Target (ml)")
jobs_tree.heading("capacity", text="Capacity (ml/min)")
jobs_tree.heading("duration", text="Duration (s)")
jobs_tree.column("idx", width=40, anchor="center")
jobs_tree.column("relay", width=80, anchor="center")
jobs_tree.column("target_ml", width=120, anchor="center")
jobs_tree.column("capacity", width=130, anchor="center")
jobs_tree.column("duration", width=100, anchor="center")

jobs_scroll = ttk.Scrollbar(jobs_frame, orient="vertical", command=jobs_tree.yview)
jobs_tree.configure(yscrollcommand=jobs_scroll.set)
jobs_tree.pack(side="left", fill="both", expand=True)
jobs_scroll.pack(side="right", fill="y")

summary_var = tk.StringVar(value="Jobs: 0 | Total ml: 0.00 | Total duration: 0s")
ttk.Label(left, textvariable=summary_var, style="Subtle.TLabel", padding=(8, 6)).pack(fill="x")

# Status
status_frame = ttk.LabelFrame(right, text="Run Status", padding=10, style="Panel.TLabelframe")
status_frame.pack(fill="x", pady=(0, 10))

status_main_var = tk.StringVar(value="IDLE")
status_relay_var = tk.StringVar(value="-")
status_total_var = tk.StringVar(value="Run elapsed: 0s / planned 0s")

run_badge = tk.Label(status_frame, text="IDLE", bg="#58616a", fg="white", padx=10, pady=4, font=("TkDefaultFont", 10, "bold"))
run_badge.grid(row=0, column=2, sticky="e", padx=(12, 0))

ttk.Label(status_frame, text="State:").grid(row=0, column=0, sticky="w", padx=(0, 6))
ttk.Label(status_frame, textvariable=status_main_var).grid(row=0, column=1, sticky="w")

ttk.Label(status_frame, text="Relay:").grid(row=1, column=0, sticky="w", padx=(0, 6))
ttk.Label(status_frame, textvariable=status_relay_var).grid(row=1, column=1, sticky="w")

ttk.Label(status_frame, textvariable=status_total_var).grid(row=2, column=0, columnspan=3, sticky="w", pady=(6, 0))

# Log
log_frame = ttk.LabelFrame(right, text="Serial Log", padding=8, style="Panel.TLabelframe")
log_frame.pack(fill="both", expand=True)

log_box = tk.Text(log_frame, height=13, font=("TkDefaultFont", 9))
log_scroll = ttk.Scrollbar(log_frame, orient="vertical", command=log_box.yview)
log_box.configure(yscrollcommand=log_scroll.set)
log_box.pack(side="left", fill="both", expand=True)
log_scroll.pack(side="right", fill="y")

log_box.tag_config("TX", foreground="#174ea6")
log_box.tag_config("RX", foreground="#137333")
log_box.tag_config("ERR", foreground="#b3261e")
log_box.tag_config("INFO", foreground="#202124")

set_connection_state(False)
set_run_state("IDLE")

# Start background tasks
main_loop()
monitor_heartbeat()

root.mainloop()
