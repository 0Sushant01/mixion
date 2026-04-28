import json
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk

import serial
import serial.tools.list_ports


# ================= SERIAL =================

ser = None
running = False


def list_ports():
    return [p.device for p in serial.tools.list_ports.comports()]


# ================= STATE =================

msg_id = 1
current_cmd = None

jobs = []
active_jobs = []

run_state = {
    "running": False,
    "run_started": None,
    "planned_total": 0,
    "relays_done": set(),  # Track which relays have finished (ESP runs all in parallel)
}

json_decoder = json.JSONDecoder()


# ================= UI =================

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
style.configure("Title.TLabel", background="#eef3f7", foreground="#153554", font=("TkDefaultFont", 13, "bold"))
style.configure("Subtle.TLabel", background="#eef3f7", foreground="#4e6072")
style.configure("Primary.TButton", font=("TkDefaultFont", 10, "bold"))
style.configure("Accent.TButton", font=("TkDefaultFont", 10, "bold"))
style.map("Primary.TButton", background=[("!disabled", "#1f6feb")], foreground=[("!disabled", "white")])
style.map("Accent.TButton", background=[("!disabled", "#2b8a3e")], foreground=[("!disabled", "white")])
style.configure("Treeview", rowheight=28, font=("TkDefaultFont", 10))
style.configure("Treeview.Heading", font=("TkDefaultFont", 10, "bold"))


def log(msg, tag="INFO"):
    timestamp = time.strftime("%H:%M:%S")
    log_box.insert(tk.END, f"[{timestamp}] {msg}\n", tag)
    log_box.see(tk.END)


def refresh_ports():
    port_menu["values"] = list_ports()
    log("Ports refreshed", "INFO")


def connect():
    global ser, running
    try:
        ser = serial.Serial(port_var.get(), 115200, timeout=1)
        # Let ESP restart after opening serial.
        time.sleep(2)

        running = True
        threading.Thread(target=read_serial, daemon=True).start()

        set_connection_state(True, port_var.get())
        log(f"Connected to {port_var.get()}", "INFO")
    except Exception as exc:
        messagebox.showerror("Error", str(exc))


def disconnect():
    global running
    running = False
    if ser and ser.is_open:
        ser.close()
    set_connection_state(False)
    log("Disconnected", "INFO")


def parse_float(value, field_name):
    try:
        parsed = float(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a number") from exc

    if parsed <= 0:
        raise ValueError(f"{field_name} must be > 0")
    return parsed


def parse_int(value, field_name):
    try:
        parsed = int(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be an integer") from exc

    if parsed <= 0:
        raise ValueError(f"{field_name} must be > 0")
    return parsed


def calc_duration_seconds(target_ml, capacity_ml_min):
    return max(1, int(round((target_ml * 60.0) / capacity_ml_min)))


def update_preview(*_):
    try:
        target = parse_float(target_ml_var.get(), "Target ml")
        cap = parse_float(capacity_var.get(), "Capacity ml/min")
        duration = calc_duration_seconds(target, cap)
        duration_preview_var.set(f"{duration} s")
    except Exception:
        duration_preview_var.set("-")


def refresh_jobs_view():
    for item in jobs_tree.get_children():
        jobs_tree.delete(item)

    total_ml = 0.0
    total_duration = 0
    for idx, job in enumerate(jobs, start=1):
        jobs_tree.insert(
            "",
            tk.END,
            values=(
                idx,
                job["relay"],
                f"{job['target_ml']:.2f}",
                f"{job['capacity_ml_min']:.2f}",
                job["duration"],
            ),
        )
        total_ml += job["target_ml"]
        total_duration += job["duration"]

    summary_var.set(
        f"Jobs: {len(jobs)} | Total dispense: {total_ml:.2f} ml | Planned duration: {total_duration} s"
    )


def add_job():
    try:
        relay = parse_int(relay_var.get(), "Relay")
        target_ml = parse_float(target_ml_var.get(), "Target ml")
        capacity_ml_min = parse_float(capacity_var.get(), "Capacity ml/min")

        duration = calc_duration_seconds(target_ml, capacity_ml_min)

        jobs.append(
            {
                "relay": relay,
                "target_ml": target_ml,
                "capacity_ml_min": capacity_ml_min,
                "duration": duration,
            }
        )
        refresh_jobs_view()
        log(
            (
                f"Job added: relay={relay}, target={target_ml:.2f} ml, "
                f"capacity={capacity_ml_min:.2f} ml/min, duration={duration}s"
            ),
            "INFO",
        )
    except Exception as exc:
        messagebox.showerror("Error", str(exc))


def remove_selected_job():
    selected = jobs_tree.selection()
    if not selected:
        messagebox.showerror("Error", "Select a job to remove")
        return

    item = selected[0]
    row_vals = jobs_tree.item(item, "values")
    idx = int(row_vals[0]) - 1
    removed = jobs.pop(idx)
    refresh_jobs_view()
    log(f"Removed job for relay {removed['relay']}", "INFO")


def clear_jobs():
    jobs.clear()
    refresh_jobs_view()
    log("Jobs cleared", "INFO")


def build_payload_jobs():
    return [{"relay": j["relay"], "duration": j["duration"]} for j in jobs]


def send(data):
    if not ser or not ser.is_open:
        messagebox.showerror("Error", "Not connected")
        return

    msg = json.dumps(data)
    log("PI -> ESP : " + msg, "TX")
    # ESP code only strips \n, not \r\n; send just \n to avoid JSON parse errors.
    ser.write((msg + "\n").encode("utf-8"))
    ser.flush()


def send_cmd():
    global msg_id, current_cmd, active_jobs

    if not ser or not ser.is_open:
        messagebox.showerror("Error", "Not connected")
        return

    if not jobs:
        messagebox.showerror("Error", "No jobs added")
        return

    payload_jobs = build_payload_jobs()
    cmd = {"type": "CMD", "msg_id": str(msg_id), "jobs": payload_jobs}
    current_cmd = cmd
    active_jobs = [j.copy() for j in jobs]

    run_state["planned_total"] = sum(j["duration"] for j in jobs)
    send(cmd)
    jobs.clear()
    refresh_jobs_view()
    log("Queued jobs sent and cleared", "INFO")
    msg_id += 1


def test_status():
    send({"type": "STATUS", "msg_id": "test"})


def update_runtime_ui():
    if not run_state["running"]:
        return

    now = time.monotonic()
    run_elapsed = int(now - run_state["run_started"]) if run_state["run_started"] else 0
    step_elapsed = int(now - run_state["step_started"]) if run_state["step_started"] else 0

    total_planned = run_state["planned_total"]
    status_total_var.set(f"Run elapsed: {run_elapsed}s / planned {total_planned}s")
    status_step_var.set(f"Current step elapsed: {step_elapsed}s")

    root.after(500, update_runtime_ui)


def start_run_tracking():
    run_state["running"] = True
    run_state["run_started"] = time.monotonic()
    run_state["relays_done"] = set()
    set_run_state("RUNNING")
    status_relay_var.set("All relays active (parallel execution)")
    update_runtime_ui()


def stop_run_tracking(final_state):
    global active_jobs

    run_state["running"] = False
    run_state["relays_done"] = set()
    active_jobs = []
    set_run_state(final_state)


def check_relay_duration(relay_num, actual_seconds):
    """Check duration for a specific relay that just finished.
    Since ESP runs all relays in parallel, we need to find the job with this relay.
    """
    job = None
    for j in active_jobs:
        if j["relay"] == relay_num:
            job = j
            break

    if job is None:
        log(f"STEP_DONE relay={relay_num} but not in active jobs", "ERR")
        return

    expected = job["duration"]
    delta = actual_seconds - expected

    if abs(delta) <= 1:
        log(
            f"Relay {relay_num} duration OK: expected {expected}s, actual {actual_seconds}s",
            "INFO",
        )
    else:
        log(
            (
                f"Relay {relay_num} duration drift: expected {expected}s, "
                f"actual {actual_seconds}s, delta {delta:+d}s"
            ),
            "ERR",
        )


def handle_response(resp):
    global current_cmd

    rtype = resp.get("type")

    if rtype == "ACK":
        log("ACK received", "INFO")

        if current_cmd and resp.get("jobs") == current_cmd["jobs"]:
            log("ACK valid -> sending VERIFIED", "INFO")
            verified = {
                "type": "VERIFIED",
                "msg_id": current_cmd["msg_id"],
                "jobs": current_cmd["jobs"],
            }
            send(verified)
        else:
            log("ACK invalid", "ERR")

    elif rtype == "STARTED":
        log("STARTED", "INFO")
        start_run_tracking()

    elif rtype == "STEP_DONE":
        relay_done = resp.get("relay")
        log(f"STEP_DONE relay={relay_done}", "INFO")

        if not run_state["running"]:
            log(f"STEP_DONE received but not running", "ERR")
            return

        # Calculate actual duration for this specific relay (parallel execution).
        now = time.monotonic()
        if run_state["run_started"] is not None:
            actual_relay_seconds = int(now - run_state["run_started"])
            check_relay_duration(relay_done, actual_relay_seconds)

        run_state["relays_done"].add(relay_done)
        remaining = len(active_jobs) - len(run_state["relays_done"])
        status_relay_var.set(f"Relay {relay_done} done, {remaining} relay(s) remaining")

    elif rtype == "DONE":
        log("DONE", "INFO")
        stop_run_tracking("DONE")

    elif rtype == "DISCARDED":
        log("DISCARDED", "ERR")
        stop_run_tracking("DISCARDED")

    elif rtype == "ERROR":
        log(f"ERROR: {resp.get('reason')}", "ERR")
        stop_run_tracking("ERROR")

    elif rtype == "LIVE":
        log("HEARTBEAT", "INFO")


def read_serial():
    global running

    buffer = ""
    while running:
        try:
            data = ser.read(ser.in_waiting or 1).decode("utf-8", errors="ignore")
            if not data:
                continue

            # Normalize carriage returns because many serial devices emit \r or \r\n.
            buffer += data.replace("\r", "\n")

            messages, buffer = extract_json_messages(buffer)
            for parsed in messages:
                log("ESP -> PI : " + json.dumps(parsed, separators=(",", ":")), "RX")
                handle_response(parsed)

            # Keep buffer bounded if serial stream contains garbage/noise.
            if len(buffer) > 2048:
                buffer = buffer[-1024:]
        except Exception as exc:
            log(f"READ ERROR: {exc}", "ERR")
            break


def extract_json_messages(stream_buffer):
    messages = []
    idx = 0
    size = len(stream_buffer)

    while idx < size:
        while idx < size and stream_buffer[idx] not in "[{":
            idx += 1

        if idx >= size:
            return messages, ""

        try:
            obj, end = json_decoder.raw_decode(stream_buffer, idx)
        except json.JSONDecodeError:
            # Incomplete JSON: keep from first possible JSON char for next serial chunk.
            return messages, stream_buffer[idx:]

        messages.append(obj)
        idx = end

    return messages, ""


# ================= LAYOUT =================

main = ttk.Frame(root, padding=10, style="App.TFrame")
main.pack(fill="both", expand=True)

header = tk.Frame(main, bg="#113a5c", bd=0, relief="flat")
header.pack(fill="x", pady=(0, 10))

title_wrap = tk.Frame(header, bg="#113a5c")
title_wrap.pack(side="left", padx=14, pady=10)
tk.Label(
    title_wrap,
    text="Relay Dispense Controller",
    bg="#113a5c",
    fg="#f4f8fc",
    font=("TkDefaultFont", 14, "bold"),
).pack(anchor="w")
tk.Label(
    title_wrap,
    text="Plan by ml, auto-calculate duration, monitor runtime drift.",
    bg="#113a5c",
    fg="#b7d1e8",
    font=("TkDefaultFont", 10),
).pack(anchor="w")

conn_badge = tk.Label(
    header,
    text="DISCONNECTED",
    bg="#7a1f27",
    fg="white",
    padx=12,
    pady=6,
    font=("TkDefaultFont", 10, "bold"),
)
conn_badge.pack(side="right", padx=14, pady=12)

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

ttk.Label(builder, text="Calculated Duration").grid(row=0, column=3, sticky="w")
ttk.Label(builder, textvariable=duration_preview_var).grid(row=1, column=3, padx=(0, 10), sticky="w")

ttk.Button(builder, text="Add Job", style="Primary.TButton", command=add_job).grid(row=1, column=4, padx=(0, 6))
ttk.Button(builder, text="Remove Selected", command=remove_selected_job).grid(row=1, column=5, padx=(0, 6))
ttk.Button(builder, text="Clear", command=clear_jobs).grid(row=1, column=6)

target_ml_var.trace_add("write", update_preview)
capacity_var.trace_add("write", update_preview)
update_preview()

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

summary_var = tk.StringVar(value="Jobs: 0 | Total dispense: 0.00 ml | Planned duration: 0 s")
ttk.Label(left, textvariable=summary_var, style="Subtle.TLabel", padding=(8, 6)).pack(fill="x")

status_frame = ttk.LabelFrame(right, text="Run Status", padding=10, style="Panel.TLabelframe")
status_frame.pack(fill="x", pady=(0, 10))

status_main_var = tk.StringVar(value="IDLE")
status_relay_var = tk.StringVar(value="-")
status_total_var = tk.StringVar(value="Run elapsed: 0s / planned 0s")
status_step_var = tk.StringVar(value="Current step elapsed: 0s")


def set_connection_state(connected, port=""):
    if connected:
        conn_var.set(f"Connected: {port}")
        conn_badge.config(text="CONNECTED", bg="#1f7a3a")
    else:
        conn_var.set("Disconnected")
        conn_badge.config(text="DISCONNECTED", bg="#7a1f27")


def set_run_state(state):
    status_main_var.set(state)
    if state == "RUNNING":
        run_badge.config(text="RUNNING", bg="#1f7a3a")
    elif state == "DONE":
        run_badge.config(text="DONE", bg="#2f5fa6")
    elif state in {"ERROR", "DISCARDED"}:
        run_badge.config(text=state, bg="#8c2f1b")
    else:
        run_badge.config(text=state, bg="#58616a")


run_badge = tk.Label(
    status_frame,
    text="IDLE",
    bg="#58616a",
    fg="white",
    padx=10,
    pady=4,
    font=("TkDefaultFont", 10, "bold"),
)
run_badge.grid(row=0, column=2, sticky="e", padx=(12, 0))

ttk.Label(status_frame, text="State:").grid(row=0, column=0, sticky="w", padx=(0, 6))
ttk.Label(status_frame, textvariable=status_main_var).grid(row=0, column=1, sticky="w")

ttk.Label(status_frame, text="Relay:").grid(row=1, column=0, sticky="w", padx=(0, 6))
ttk.Label(status_frame, textvariable=status_relay_var).grid(row=1, column=1, sticky="w")

ttk.Label(status_frame, textvariable=status_total_var).grid(row=2, column=0, columnspan=3, sticky="w", pady=(6, 0))
ttk.Label(status_frame, textvariable=status_step_var).grid(row=3, column=0, columnspan=3, sticky="w")

log_frame = ttk.LabelFrame(right, text="Serial Log", padding=8, style="Panel.TLabelframe")
log_frame.pack(fill="both", expand=True)

log_box = tk.Text(log_frame, height=13)
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


root.mainloop()