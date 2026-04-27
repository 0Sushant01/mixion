import tkinter as tk
from tkinter import ttk, messagebox
import serial
import serial.tools.list_ports
import threading
import json
import time

# ================= SERIAL =================

ser = None
running = False

def list_ports():
    return [p.device for p in serial.tools.list_ports.comports()]

# ================= UI =================

root = tk.Tk()
root.title("ESP32 Controller")
root.geometry("800x650")

# ---------------- PORT ----------------

port_var = tk.StringVar(value="/dev/ttyUSB0")

port_menu = ttk.Combobox(root, textvariable=port_var, values=list_ports(), width=30)
port_menu.pack(pady=5)

def refresh_ports():
    port_menu['values'] = list_ports()
    log("Ports refreshed", "INFO")

tk.Button(root, text="Refresh Ports", command=refresh_ports).pack()

# ---------------- CONNECT ----------------

def connect():
    global ser, running
    try:
        ser = serial.Serial(port_var.get(), 115200, timeout=1)

        time.sleep(2)  # 🔥 ESP RESET FIX

        running = True
        threading.Thread(target=read_serial, daemon=True).start()

        log(f"Connected to {port_var.get()}", "INFO")

    except Exception as e:
        messagebox.showerror("Error", str(e))

def disconnect():
    global running
    running = False
    if ser and ser.is_open:
        ser.close()
    log("Disconnected", "INFO")

tk.Button(root, text="Connect", command=connect).pack()
tk.Button(root, text="Disconnect", command=disconnect).pack()

# ---------------- LOG ----------------

log_box = tk.Text(root, height=18)
log_box.pack(fill="both", padx=10, pady=10)

log_box.tag_config("TX", foreground="blue")
log_box.tag_config("RX", foreground="green")
log_box.tag_config("ERR", foreground="red")
log_box.tag_config("INFO", foreground="black")

def log(msg, tag="INFO"):
    timestamp = time.strftime("%H:%M:%S")
    log_box.insert(tk.END, f"[{timestamp}] {msg}\n", tag)
    log_box.see(tk.END)

# ---------------- JOB BUILDER ----------------

jobs_frame = tk.Frame(root)
jobs_frame.pack()

jobs = []

relay_var = tk.StringVar()
duration_var = tk.StringVar()

def add_job():
    try:
        relay = int(relay_var.get())
        duration = int(duration_var.get())

        job = {"relay": relay, "duration": duration}
        jobs.append(job)

        job_list.insert(tk.END, f"Relay {relay} - {duration}s")

    except:
        messagebox.showerror("Error", "Invalid input")

tk.Label(jobs_frame, text="Relay").grid(row=0, column=0)
tk.Entry(jobs_frame, textvariable=relay_var).grid(row=0, column=1)

tk.Label(jobs_frame, text="Duration").grid(row=0, column=2)
tk.Entry(jobs_frame, textvariable=duration_var).grid(row=0, column=3)

tk.Button(jobs_frame, text="Add Job", command=add_job).grid(row=0, column=4)

job_list = tk.Listbox(root)
job_list.pack(fill="both", padx=10, pady=5)

def clear_jobs():
    jobs.clear()
    job_list.delete(0, tk.END)

tk.Button(root, text="Clear Jobs", command=clear_jobs).pack()

# ---------------- SEND CMD ----------------

msg_id = 1
current_cmd = None

def send_cmd():
    global msg_id, current_cmd

    if not ser or not ser.is_open:
        messagebox.showerror("Error", "Not connected")
        return

    if not jobs:
        messagebox.showerror("Error", "No jobs added")
        return

    cmd = {
        "type": "CMD",
        "msg_id": str(msg_id),
        "jobs": jobs.copy()
    }

    current_cmd = cmd

    send(cmd)
    msg_id += 1

tk.Button(root, text="Send CMD", command=send_cmd).pack(pady=10)

# ---------------- TEST BUTTON ----------------

def test_status():
    send({"type": "STATUS", "msg_id": "test"})

tk.Button(root, text="Test STATUS", command=test_status).pack()

# ---------------- SERIAL SEND ----------------

def send(data):
    msg = json.dumps(data)
    log("PI → ESP : " + msg, "TX")

    ser.write((msg + "\n").encode("utf-8"))
    ser.flush()   # 🔥 FIX

# ---------------- SERIAL READ ----------------

def read_serial():
    global running

    while running:
        try:
            line = ser.readline().decode().strip()
            if not line:
                continue

            log("ESP → PI : " + line, "RX")

            try:
                data = json.loads(line)
                handle_response(data)
            except:
                log("Invalid JSON", "ERR")

        except:
            break

# ---------------- HANDSHAKE ----------------

def handle_response(resp):
    global current_cmd

    rtype = resp.get("type")

    if rtype == "ACK":
        log("ACK received", "INFO")

        if current_cmd and resp.get("jobs") == current_cmd["jobs"]:
            log("ACK valid → sending VERIFIED", "INFO")

            verified = {
                "type": "VERIFIED",
                "msg_id": current_cmd["msg_id"],
                "jobs": current_cmd["jobs"]
            }

            send(verified)
        else:
            log("ACK INVALID", "ERR")

    elif rtype == "STARTED":
        log("STARTED", "INFO")

    elif rtype == "STEP_DONE":
        log(f"STEP DONE Relay {resp.get('relay')}", "INFO")

    elif rtype == "DONE":
        log("DONE", "INFO")

    elif rtype == "DISCARDED":
        log("DISCARDED", "ERR")

    elif rtype == "ERROR":
        log(f"ERROR: {resp.get('reason')}", "ERR")

    elif rtype == "LIVE":
        log("HEARTBEAT", "INFO")

# ---------------- RUN ----------------

root.mainloop()