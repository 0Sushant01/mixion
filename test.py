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

run_state = {
    "running": False,
    "job_index": -1,
    "run_started": None,
    "step_started": None,
    "planned_total": 0,
}


# ================= UI =================

root = tk.Tk()
root.title("Relay Dispense Controller")
root.geometry("980x760")

style = ttk.Style(root)
style.theme_use("clam")
style.configure("Title.TLabel", font=("TkDefaultFont", 13, "bold"))


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

        conn_var.set(f"Connected: {port_var.get()}")
        log(f"Connected to {port_var.get()}", "INFO")
    except Exception as exc:
        messagebox.showerror("Error", str(exc))


def disconnect():
    global running
    running = False
    if ser and ser.is_open:
        ser.close()
    conn_var.set("Disconnected")
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
    ser.write((msg + "\n").encode("utf-8"))
    ser.flush()


def send_cmd():
    global msg_id, current_cmd

    if not ser or not ser.is_open:
        messagebox.showerror("Error", "Not connected")
        return

    if not jobs:
        messagebox.showerror("Error", "No jobs added")
        return

    payload_jobs = build_payload_jobs()
    cmd = {"type": "CMD", "msg_id": str(msg_id), "jobs": payload_jobs}
    current_cmd = cmd

    run_state["planned_total"] = sum(j["duration"] for j in jobs)
    send(cmd)
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
    run_state["job_index"] = 0
    run_state["run_started"] = time.monotonic()
    run_state["step_started"] = time.monotonic()
    status_main_var.set("RUNNING")

    if jobs:
        current = jobs[0]
        status_relay_var.set(f"Relay {current['relay']} (planned {current['duration']}s)")
    else:
        status_relay_var.set("-")

    update_runtime_ui()


def stop_run_tracking(final_state):
    run_state["running"] = False
    run_state["job_index"] = -1
    run_state["step_started"] = None
    status_main_var.set(final_state)


def check_step_duration(step_idx, actual_seconds, relay_from_resp=None):
    if step_idx < 0 or step_idx >= len(jobs):
        log("STEP_DONE received but step index is out of range", "ERR")
        return

    expected = jobs[step_idx]["duration"]
    expected_relay = jobs[step_idx]["relay"]
    delta = actual_seconds - expected

    if relay_from_resp is not None and relay_from_resp != expected_relay:
        log(
            (
                f"Relay mismatch: expected relay {expected_relay}, "
                f"got relay {relay_from_resp}"
            ),
            "ERR",
        )

    if abs(delta) <= 1:
        log(
            f"Relay {expected_relay} duration OK: expected {expected}s, actual {actual_seconds}s",
            "INFO",
        )
    else:
        log(
            (
                f"Relay {expected_relay} duration drift: expected {expected}s, "
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

        now = time.monotonic()
        if run_state["step_started"] is not None and run_state["job_index"] >= 0:
            actual_step_seconds = int(now - run_state["step_started"])
            check_step_duration(run_state["job_index"], actual_step_seconds, relay_done)

        run_state["job_index"] += 1
        run_state["step_started"] = now

        if 0 <= run_state["job_index"] < len(jobs):
            next_job = jobs[run_state["job_index"]]
            status_relay_var.set(
                f"Relay {next_job['relay']} (planned {next_job['duration']}s)"
            )
        else:
            status_relay_var.set("Waiting for DONE")

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
            data = ser.read(ser.in_waiting or 1).decode(errors="ignore")
            if not data:
                continue

            buffer += data
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue

                log("ESP -> PI : " + line, "RX")
                try:
                    parsed = json.loads(line)
                    handle_response(parsed)
                except Exception:
                    log(f"JSON ERROR -> {line}", "ERR")
        except Exception as exc:
            log(f"READ ERROR: {exc}", "ERR")
            break


# ================= LAYOUT =================

top = ttk.Frame(root, padding=10)
top.pack(fill="x")

ttk.Label(top, text="Serial Connection", style="Title.TLabel").grid(
    row=0, column=0, columnspan=6, sticky="w", pady=(0, 8)
)

port_var = tk.StringVar(value="/dev/ttyUSB0")
conn_var = tk.StringVar(value="Disconnected")

port_menu = ttk.Combobox(top, textvariable=port_var, values=list_ports(), width=24)
port_menu.grid(row=1, column=0, padx=(0, 8))

ttk.Button(top, text="Refresh", command=refresh_ports).grid(row=1, column=1, padx=4)
ttk.Button(top, text="Connect", command=connect).grid(row=1, column=2, padx=4)
ttk.Button(top, text="Disconnect", command=disconnect).grid(row=1, column=3, padx=4)
ttk.Button(top, text="Send CMD", command=send_cmd).grid(row=1, column=4, padx=4)
ttk.Button(top, text="Test STATUS", command=test_status).grid(row=1, column=5, padx=4)

ttk.Label(top, textvariable=conn_var).grid(row=2, column=0, columnspan=6, sticky="w", pady=(8, 0))

builder = ttk.LabelFrame(root, text="Dispense Job Builder", padding=10)
builder.pack(fill="x", padx=10, pady=(0, 10))

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

ttk.Button(builder, text="Add Job", command=add_job).grid(row=1, column=4, padx=(0, 6))
ttk.Button(builder, text="Remove Selected", command=remove_selected_job).grid(row=1, column=5, padx=(0, 6))
ttk.Button(builder, text="Clear", command=clear_jobs).grid(row=1, column=6)

target_ml_var.trace_add("write", update_preview)
capacity_var.trace_add("write", update_preview)
update_preview()

middle = ttk.Frame(root, padding=(10, 0, 10, 0))
middle.pack(fill="both", expand=True)

jobs_frame = ttk.LabelFrame(middle, text="Queued Jobs", padding=8)
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

jobs_tree.pack(fill="both", expand=True)

summary_var = tk.StringVar(value="Jobs: 0 | Total dispense: 0.00 ml | Planned duration: 0 s")
ttk.Label(root, textvariable=summary_var, padding=(10, 4)).pack(fill="x")

status_frame = ttk.LabelFrame(root, text="Run Status", padding=10)
status_frame.pack(fill="x", padx=10, pady=(0, 10))

status_main_var = tk.StringVar(value="IDLE")
status_relay_var = tk.StringVar(value="-")
status_total_var = tk.StringVar(value="Run elapsed: 0s / planned 0s")
status_step_var = tk.StringVar(value="Current step elapsed: 0s")

ttk.Label(status_frame, text="State:").grid(row=0, column=0, sticky="w", padx=(0, 6))
ttk.Label(status_frame, textvariable=status_main_var).grid(row=0, column=1, sticky="w")

ttk.Label(status_frame, text="Relay:").grid(row=1, column=0, sticky="w", padx=(0, 6))
ttk.Label(status_frame, textvariable=status_relay_var).grid(row=1, column=1, sticky="w")

ttk.Label(status_frame, textvariable=status_total_var).grid(row=2, column=0, columnspan=3, sticky="w", pady=(6, 0))
ttk.Label(status_frame, textvariable=status_step_var).grid(row=3, column=0, columnspan=3, sticky="w")

log_frame = ttk.LabelFrame(root, text="Serial Log", padding=8)
log_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))

log_box = tk.Text(log_frame, height=13)
log_box.pack(fill="both", expand=True)
log_box.tag_config("TX", foreground="#174ea6")
log_box.tag_config("RX", foreground="#137333")
log_box.tag_config("ERR", foreground="#b3261e")
log_box.tag_config("INFO", foreground="#202124")


root.mainloop()