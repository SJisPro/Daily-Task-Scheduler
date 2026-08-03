# Linux File System Hierarchy

## Overview
The Linux Filesystem Hierarchy Standard (FHS) defines the structure and organization of directories and files in Linux operating systems. Unlike Windows, which uses drive letters (`C:`, `D:`), Linux represents everything under a single unified root directory (`/`). 

In SRE and Systems Architecture, understanding the FHS is critical because Linux treats virtually all system abstractions—including physical hardware devices, running process metadata, network interfaces, and IPC sockets—as files or nodes within this single tree structure.

## Why Learn Linux File System Hierarchy?
- **Incident Response & Triage:** Rapidly locate application logs (`/var/log`), runtime state files (`/run`), and configuration settings (`/etc`) during system outages.
- **Storage & Capacity Planning:** Prevent root partition exhaustion by correctly mounting ephemeral data (`/tmp`), persistent logs (`/var`), and application data (`/mnt`, `/srv`) on separate physical block devices or logical volumes (LVM).
- **Containerization & Security:** Build minimal container images (Docker/OCI) by understanding which system directories are essential for binaries (`/usr/bin`) vs. temporary runtime data.
- **System Kernel Observability:** Read direct hardware and kernel tuning telemetry through pseudo-filesystems (`/proc` and `/sys`).

## Architecture / How It Works

```
                        / (Root Directory)
                        │
 ┌──────────┬───────────┼───────────┬───────────┬───────────┬──────────┐
 │          │           │           │           │           │          │
 /bin     /etc        /var        /proc       /sys        /tmp       /home
 (Core    (Config     (Variable   (Kernel/    (Hardware/  (Temp      (User
 Binaries) Files)     Data/Logs)  Process)    Devices)    Files)     Data)
                        │
             ┌──────────┴──────────┐
             │                     │
          /var/log             /var/run -> /run
       (System Logs)        (Runtime PIDs/Sockets)
```

## Core Concepts

| Directory | Type | Purpose / Description | Ephemeral? |
| :--- | :--- | :--- | :--- |
| `/` | Physical Mount | The root of the filesystem hierarchy. All files and directories stem from here. | No |
| `/etc` | Static Data | System-wide configuration files (e.g., `/etc/nginx/nginx.conf`, `/etc/fstab`). | No |
| `/var` | Variable Data | Dynamic operational files: logs (`/var/log`), mail spools, database storage. | No |
| `/proc` | Pseudo-FS (`procfs`) | Virtual filesystem exposing real-time kernel data structures and process stats. | Yes (In-Memory) |
| `/sys` | Pseudo-FS (`sysfs`) | Virtual filesystem exposing kernel views of physical hardware devices and drivers. | Yes (In-Memory) |
| `/dev` | Device Node | Files pointing to physical or virtual hardware (e.g., `/dev/sda1`, `/dev/null`, `/dev/urandom`). | Partial (`tmpfs`) |
| `/tmp` | Ephemeral | Temporary files created by applications. Often mounted as `tmpfs` (RAM) and cleared on boot. | Yes |
| `/usr` | Static Executables | Secondary hierarchy containing user utilities and applications (`/usr/bin`, `/usr/lib`). | No |
| `/run` | Ephemeral (`tmpfs`) | Stores runtime state data since the last boot (PIDs, UNIX domain sockets). | Yes |

## Most Used Commands

### Directory Navigation and Inspection
```bash
# List all files including hidden ones with human-readable sizes and inode numbers
ls -laih /var/log

# Print current working directory
pwd

# Display directory structure up to 2 levels deep
tree -L 2 /etc

# Show disk space usage across all mounted filesystems in human-readable format
df -hT

# Measure total disk space consumed by a specific directory tree
du -sh /var/log/* | sort -hr
```

### Advanced File & Path Searching
```bash
# Locate all configuration files (.conf) in /etc modified in the last 24 hours
find /etc -type f -name "*.conf" -mtime -1

# Search for dead or broken symbolic links across the system
find / -xtype l -exec ls -l {} + 2>/dev/null

# Display detailed metadata (Inodes, Access/Modify/Change times, Permissions) of a file
stat /etc/passwd
```

## Mini Example (Runnable Step-by-Step)

In this hands-on exercise, you will inspect storage allocations, explore dynamic kernel data in `/proc`, and test write behaviors in ephemeral vs. persistent system paths.

```bash
# Step 1: Check the disk usage of the root directory and find filesystem mount types
df -hT /

# Step 2: Explore the pseudo-filesystem /proc to view active CPU information
cat /proc/cpuinfo | grep "model name" | head -n 2

# Step 3: Inspect dynamic runtime process information for the current shell (PID $$)
cat /proc/$$/status | head -n 10

# Step 4: Verify how device nodes behave by redirecting stdout to the null device
echo "This output will be discarded" > /dev/null

# Step 5: Create a temporary file in /tmp and observe system cleanup paths
touch /tmp/sre_healthcheck_$(date +%s).tmp
ls -l /tmp/sre_healthcheck_*.tmp

# Step 6: Clean up temporary test file
rm -f /tmp/sre_healthcheck_*.tmp
```

## Common Mistakes
- **Writing operational data to root (`/`):** Allowing log files or container dumps to write directly to `/` instead of designated volumes mounted at `/var` or dedicated block storage.
- **Modifying files in `/proc` or `/sys` with text editors:** Attempting to open `/proc/meminfo` or similar pseudo-files with `vim` can lead to editor locks or unexpected behavior; use `cat`, `echo`, or kernel parameter tools (`sysctl`).
- **Ignoring mount boundaries:** Assuming space cleared in `/tmp` will free space on `/` when `/tmp` is mounted on a separate `tmpfs` mount point.

---

# File Permissions and Ownership

## Overview
Linux implements Discretionary Access Control (DAC) to govern file security. Every file and directory on a Linux system is bound to an owner user, an owner group, and access permission sets defined for three target scopes: **User (u)**, **Group (g)**, and **Others (o)**. 

Permissions dictate three primitive capabilities: **Read (r)**, **Write (w)**, and **Execute (x)**, complemented by advanced bits such as **SUID**, **SGID**, and the **Sticky Bit**.

## Why Learn File Permissions and Ownership?
- **Least Privilege Access:** Secure sensitive credentials (e.g., SSH private keys, DB secrets) by restricting permissions (e.g., `chmod 600 id_rsa`).
- **Service Security:** Ensure background system services (like Nginx, PostgreSQL) run under non-root service accounts with scoped permissions on application assets.
- **Shared Team Workspaces:** Configure collaborative directories using SGID so newly created files automatically inherit group ownership.
- **Preventing Privilege Escalation:** Detect and audit unsafe SUID binaries that could allow unprivileged users to execute code as root.

## Architecture / How It Works

```
 File Type & Permissions Notation
 ┌── File Type (- = Regular File, d = Directory, l = Symlink)
 │   ┌── User Permissions (rwx)
 │   │   ┌── Group Permissions (r-x)
 │   │   │   ┌── Others Permissions (r-x)
 │   │   │   │
 -  rwx r-x r-x   1  root  www-data  4096  Oct 24 10:00  script.sh
    └┬┘ └┬┘ └┬┘      │     │
     │   │   │       │     └── Owning Group
     │   │   │       └──────── Owning User
     │   │   └──────────────── Others (Read + Execute = 5)
     │   └──────────────────── Group  (Read + Execute = 5)
     └──────────────────────── User   (Read + Write + Execute = 7)
```

Numeric Representation: Read (4) + Write (2) + Execute (1)

## Core Concepts

### Basic Permissions Matrix

| Bit | Value | Meaning on Regular File | Meaning on Directory |
| :--- | :--- | :--- | :--- |
| **r** | 4 | Allows reading file contents. | Allows listing directory contents (`ls`). |
| **w** | 2 | Allows modifying/overwriting file contents. | Allows creating, deleting, or renaming files inside directory. |
| **x** | 1 | Allows executing the file as a process. | Allows entering/traversing the directory (`cd`). |

### Special Permission Bits

| Special Bit | Octal Value | Symbol | Effect on Binary / Directory |
| :--- | :--- | :--- | :--- |
| **SUID** (Set User ID) | 4000 | `u+s` (`rws------`) | Executable runs with permissions of the file owner (e.g., `/usr/bin/passwd`). |
| **SGID** (Set Group ID) | 2000 | `g+s` (`r-xrws---`) | Executable runs with permissions of owning group. On directories: new files inherit directory's group ownership. |
| **Sticky Bit** | 1000 | `o+t` (`rwxrwxrwt`) | On directories: files can only be deleted or renamed by the file owner or root (e.g., `/tmp`). |

### Umask (User Mask)
The `umask` determines default permissions applied to newly created files and directories.
- Default system base permissions: **666** for files, **777** for directories.
- Formula: `Default Base Permissions - Umask = Effective Permissions`.
- Example: Umask `022` yields `644` (`rw-r--r--`) for files and `755` (`rwxr-xr-x`) for directories.

## Most Used Commands

### Modifying Permissions (`chmod`)
```bash
# Symbolic mode: Give owner write, remove group/others write
chmod u+w,go-w system.log

# Absolute (Octal) mode: Set Owner=RWX (7), Group=RX (5), Others=None (0)
chmod 750 /opt/app/bin/start.sh

# Apply sticky bit to a shared folder
chmod +t /var/shared_data/

# Set SGID on a directory so all new files inherit group ownership
chmod g+s /opt/team_workspace/

# Recursively set permissions on directories (755) and files (644) separately
find /var/www/html -type d -exec chmod 755 {} +
find /var/www/html -type f -exec chmod 644 {} +
```

### Modifying Ownership (`chown`, `chgrp`)
```bash
# Change file user ownership to 'appuser'
chown appuser config.yaml

# Change both user and group ownership recursively
chown -R appuser:www-data /var/www/app

# Change only group ownership
chgrp deployment /opt/deployments
```

### Inspecting and Masking
```bash
# Display default umask in symbolic and numeric format
umask -S
umask

# Temporarily change umask for current subshell context
(umask 077 && touch /tmp/private_file.txt)
```

## Mini Example (Runnable Step-by-Step)

In this example, you will construct a secure shared team directory with SGID enabled, strict access rules, and sticky bits.

```bash
# Step 1: Create a mock team group and user test directory structure
sudo groupadd sre_team 2>/dev/null || true
mkdir -p /tmp/sre_workspace

# Step 2: Assign group ownership to sre_team and restrict access from 'others'
sudo chgrp sre_team /tmp/sre_workspace
chmod 770 /tmp/sre_workspace
ls -ld /tmp/sre_workspace

# Step 3: Enable SGID so new files automatically belong to 'sre_team'
chmod g+s /tmp/sre_workspace
ls -ld /tmp/sre_workspace
# Output bit pattern should display 'rwxr-s---'

# Step 4: Apply Sticky Bit to prevent unauthorized file deletion within the directory
chmod +t /tmp/sre_workspace
ls -ld /tmp/sre_workspace
# Output bit pattern should display 'rwxr-sr-t'

# Step 5: Test file creation inside directory and verify inherited permissions
touch /tmp/sre_workspace/shared_config.env
ls -l /tmp/sre_workspace/shared_config.env

# Step 6: Cleanup
rm -rf /tmp/sre_workspace
```

## Common Mistakes
- **Using `chmod 777` as a quick fix:** Over-granting full permissions bypasses security policies and leaves files vulnerable to tampering or unauthorized execution.
- **Forgetting directory execution (`x`) bits:** Removing execution permissions from a directory prevents users from using `cd` into it or accessing any child files, even if file read permissions are granted.
- **Misinterpreting Recursive `chown`/`chmod` Risks:** Executing `chown -R user /` or `chmod -R 777 /etc` can irreversibly destroy system access controls, requiring OS reinstallation.

---

# Process Management (ps, top, kill)

## Overview
A process is an active instance of a running program in system memory. In Linux, every process is assigned a unique Process ID (PID) and is tracked by the kernel through an explicitly managed lifecycle: creation via `fork()`/`exec()`, parent-child relationships, resource allocation, state changes, and eventual termination.

Managing processes involves monitoring system performance metrics (CPU/Memory usage), manipulating process execution, and sending kernel signals to manage application lifecycle stages.

## Why Learn Process Management?
- **Performance Optimization & Debugging:** Identify and isolate resource hogs, memory leaks, and CPU starvation issues in production clusters.
- **Containerization Diagnostics:** Inspect processes running inside Linux containers (`docker exec`, Kubernetes pods) directly from host node contexts.
- **Graceful Lifecycle Management:** Restart background services safely using proper shutdown signals (`SIGTERM`) without corrupting state or dropping active user requests.
- **Handling Hung Systems:** Safely deal with frozen applications, deadlocked threads, and zombie processes (`Z` state).

## Architecture / How It Works

```
                       Process State Lifecycle Diagram
                       
    ┌─────────────┐   fork()    ┌─────────────┐  Schedule   ┌─────────────┐
    │ New Process │────────────>│ Ready /     │────────────>│ Running (R) │
    └─────────────┘             │ Runnable    │             └──────┬──────┘
                                └─────────────┘                    │
                                       ▲                           │
                                       │ Interrupt/Yield           │ I/O Wait /
                                       └───────────────────────────┤ Sleep
                                                                   ▼
    ┌─────────────┐             ┌─────────────┐            ┌───────────────┐
    │ Terminated  │<────────────│ Zombie (Z)  │<───────────│ Sleeping      │
    │ (Dead)      │ Child Exit  │ (Defunct)   │ Task Exit  │ (S = Interrupt│
    └─────────────┘             └─────────────┘            │  D = Uninterr)│
                                                           └───────────────┘
```

## Core Concepts

### Process States

| State Code | Name | Description | SRE Operational Focus |
| :--- | :--- | :--- | :--- |
| **R** | Running / Runnable | Executing on CPU or waiting in run queue. | High numbers indicate high CPU load/contention. |
| **S** | Interruptible Sleep | Waiting for an event or I/O signal. | Normal state for idle background services. |
| **D** | Uninterruptible Sleep | Blocked on synchronous I/O operations (e.g., waiting for slow disk or NFS network response). Cannot be killed by `kill -9`. | High numbers signal disk subsystem bottlenecks or stale network mounts. |
| **Z** | Zombie / Defunct | Process has completed execution, but parent process has not read its exit status via `wait()`. | Consumes PID space. Parent process must be debugged or restarted. |
| **T** | Stopped | Stopped by job control signal (`SIGSTOP` or `Ctrl+Z`). | Suspended process in foreground/background. |

### Essential Linux Signals

| Signal Name | Number | Command / Shortcut | Kernel Behavior | Overridable? |
| :--- | :--- | :--- | :--- | :--- |
| **SIGHUP** | 1 | `kill -1 PID` | Hangup. Tells process to reload configuration files. | Yes |
| **SIGINT** | 2 | `Ctrl + C` | Terminal interrupt. Requests process to abort gracefully. | Yes |
| **SIGKILL** | 9 | `kill -9 PID` | Immediate force termination by kernel. Unsaved data lost. | **No** (Cannot be caught/blocked) |
| **SIGTERM** | 15 | `kill -15 PID` | Graceful termination request. Gives time to cleanup resources. | Yes |
| **SIGSTOP** | 19 | `Ctrl + Z` | Suspends process execution immediately. | **No** |

## Most Used Commands

### Process Listing & Telemetry (`ps`, `pgrep`, `pstree`)
```bash
# Standard BSD style snapshot: Show all processes on the system with full user info
ps aux

# Standard System V style: Show full format tree hierarchy with thread information
ps -ef --forest

# Find Process ID (PID) of a specific service by process name
pgrep -l nginx

# Display active process tree starting from PID 1 (systemd)
pstree -p 1
```

### Dynamic Process Monitoring (`top`, `htop`)
```bash
# Launch standard top interactive task manager
top

# Common top interactive keys while running:
# 'M' - Sort by Memory Usage
# 'P' - Sort by CPU Usage
# 'k' - Kill a process by entering PID
# 'q' - Quit top viewer

# Continuous non-interactive batch mode output (useful for logging top stats to a file)
top -b -n 1 | head -n 20
```

### Signal Management (`kill`, `pkill`, `killall`)
```bash
# Gracefully request process termination (SIGTERM - Signal 15)
kill -15 12345

# Forcefully kill process immediately (SIGKILL - Signal 9)
kill -9 12345

# Send SIGHUP to reload service configurations by process name match
pkill -HUP -f nginx

# Kill all processes owned by a specific service user safely
pkill -u appuser
```

### Job Control Backgrounding (`&`, `bg`, `fg`, `jobs`, `nohup`)
```bash
# Execute a long-running process in the background
python3 -m http.server 8080 &

# Run a command immune to hangups (detaches from terminal lifecycle)
nohup ./long_running_job.sh > job.log 2>&1 &

# View active background jobs attached to the current shell
jobs -l

# Bring job #1 back to the foreground
fg %1
```

## Mini Example (Runnable Step-by-Step)

In this hands-on exercise, you will create a background process, monitor its lifecycle states, issue graceful reloads, and clean it up.

```bash
# Step 1: Launch a long-running background sleep process
sleep 300 &
BACKGROUND_PID=$!
echo "Spawned background process with PID: $BACKGROUND_PID"

# Step 2: Inspect process state and operational flags via ps
ps -p $BACKGROUND_PID -o pid,ppid,user,stat,%cpu,%mem,command

# Step 3: Inspect process file descriptor mounts directly from /proc
ls -l /proc/$BACKGROUND_PID/fd

# Step 4: Send SIGSTOP signal to pause execution
kill -STOP $BACKGROUND_PID
ps -p $BACKGROUND_PID -o pid,stat,command
# Observe 'STAT' change to 'T' (Stopped)

# Step 5: Resume execution by sending SIGCONT signal
kill -CONT $BACKGROUND_PID
ps -p $BACKGROUND_PID -o pid,stat,command

# Step 6: Gracefully terminate the process using SIGTERM
kill -15 $BACKGROUND_PID
wait $BACKGROUND_PID 2>/dev/null || true
echo "Process $BACKGROUND_PID terminated successfully."
```

## Common Mistakes
- **Overusing `kill -9` (`SIGKILL`):** Sending `SIGKILL` bypasses an application's signal handlers. Applications cannot release database locks, flush write buffers, or close open TCP sockets, potentially leading to state corruption.
- **Attempting to kill Uninterruptible Sleep (`D` state) processes:** Processes stuck waiting on hardware or deadlocked NFS file system mounts cannot handle signals while in state `D`. The root underlying storage issue must be resolved.
- **Trying to kill Zombie processes:** Zombies are already dead (`Z` state). They take no CPU or memory, only a slot in the process table. To clear a zombie, you must kill its *parent process* or force the parent to reap it.

---

# Shell Scripting Basics

## Overview
Bash shell scripting automates sequential terminal commands into executable procedural programs. A production-grade shell script orchestrates system calls, parses log inputs, controls system state changes, and interacts with the host OS environment.

Writing robust scripts for Reliability Engineering requires mastering variable scopes, conditional execution, subshells, pipelines, exit status codes, and error-handling traps.

## Why Learn Shell Scripting Basics?
- **Automation of Operational Tasks:** Automate recurring operations like log rotations, system health checks, backup creations, and metric aggregation.
- **CI/CD Pipeline Stages:** Build, test, and release code artifacts within deployment pipelines (e.g., GitHub Actions, GitLab CI, Jenkins steps execute Bash scripts).
- **Custom Observability Agents:** Write lightweight monitoring scripts that query kernel stats and export reports to monitoring systems.
- **Bootstrap Workloads:** Author startup initialization scripts (`cloud-init`, entrypoint scripts) for container workloads and cloud virtual machines.

## Architecture / How It Works

```
                         Script Execution Flow & Pipes
                         
     ┌────────────────────────────────────────────────────────┐
     │  #!/usr/bin/env bash (Shebang)                         │
     │  set -euo pipefail    (Strict Error Handling Mode)    │
     └───────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Command Execution     │
                     └───────────┬───────────┘
                                 │
                  ┌──────────────┴──────────────┐
       Exit 0     │                             │ Exit != 0
  (Success Path)  ▼                             ▼ (Error Trap Handler)
     ┌───────────────────────┐     ┌────────────────────────┐
     │ Pipeline Execution    │     │ Trigger Cleanup Trap   │
     │ command1 | command2   │     │ trap 'cleanup' ERR     │
     └───────────────────────┘     └────────────────────────┘
```

## Core Concepts

### Shell Execution Flags (`set`)

| Flag | Name | Function / Effect |
| :--- | :--- | :--- |
| `set -e` | Exit Immediately | Terminate execution instantly if any command exits with a non-zero status. |
| `set -u` | Unset Error | Treat reference to unset/uninitialized variables as an error and exit immediately. |
| `set -o pipefail` | Pipefail | Return code of a pipeline is the status of the *last* failed command, not the last successful command. |
| `set -x` | Trace Mode | Print every expanded command to stdout before executing it (useful for debugging). |

### Special Shell Variables

| Variable | Description |
| :--- | :--- |
| `$0` | The filename/path of the running script. |
| `$1, $2 ... $9` | Positional parameters representing arguments passed to the script. |
| `$#` | The total number of command-line arguments passed to the script. |
| `$@` | Array of all command-line positional parameters passed to the script (`"$@"` preserves spacing). |
| `$?` | The exit status of the most recently executed foreground command (0 = success, 1-255 = error). |
| `$$` | The Process ID (PID) of the active shell script process. |
| `$!` | The Process ID (PID) of the most recently executed background command. |

### Evaluation Operators `[[ ... ]]`

| Test Flag | Check Type | Returns True If: |
| :--- | :--- | :--- |
| `-f path` | File Exists | Path exists and is a regular file. |
| `-d path` | Directory Exists | Path exists and is a directory. |
| `-z "string"`| Empty String | String length is zero. |
| `-n "string"`| Non-Empty String | String length is non-zero. |
| `a -eq b` | Integer Equal | Arithmetic value of `a` equals `b` (`-ne`, `-gt`, `-lt`, `-ge`, `-le`). |
| `a == b` | String Equal | String pattern `a` matches `b`. |

## Most Used Commands/Syntax

### Variable Assignment & Quoting Syntax
```bash
# Good Practice: Always quote variable expansions to prevent word splitting
APP_NAME="payment-service"
APP_PORT=8080

# Command substitution: Execute command and capture output into a variable
CURRENT_KERNEL=$(uname -r)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Deploying ${APP_NAME} on kernel version: ${CURRENT_KERNEL}"
```

### Flow Control Statements (`if`, `case`, `for`, `while`)
```bash
# Conditional statement using double-bracket test
if [[ -d "/var/log/nginx" ]] && [[ -w "/var/log/nginx" ]]; then
    echo "Nginx log directory exists and is writable."
else
    echo "Error: Nginx log directory is missing or read-only." >&2
fi

# Loop over array list
SERVICES=("nginx" "postgresql" "redis")
for SERVICE in "${SERVICES[@]}"; do
    echo "Checking status of ${SERVICE}..."
done

# Case statement matching
case "$1" in
    start)   echo "Starting service..." ;;
    stop)    echo "Stopping service..." ;;
    restart) echo "Restarting service..." ;;
    *)       echo "Usage: $0 {start|stop|restart}"; exit 1 ;;
esac
```

### Subshells and Redirections
```bash
# Redirect standard output (stdout - 1) and standard error (stderr - 2)
/opt/app/bin/healthcheck.sh > /tmp/stdout.log 2> /tmp/stderr.log

# Combine stdout and stderr into single log destination
/opt/app/bin/run.sh > /var/log/app.log 2>&1

# Execute block inside isolated subshell environment
(
    cd /tmp
    touch isolation_test.txt
)
# Current working directory remains unchanged outside subshell
```

## Mini Example (Runnable Step-by-Step)

In this example, you will write and execute a self-contained, production-grade service log rotation script complete with strict error handling, input argument checks, and exit traps.

```bash
# Step 1: Create a shell script file
cat << 'EOF' > /tmp/backup_logs.sh
#!/usr/bin/env bash

# Enable Strict Script Execution Guardrails
set -euo pipefail

# Configuration Setup
LOG_DIR="/tmp/mock_app_logs"
BACKUP_DIR="/tmp/mock_app_backups"

# Cleanup Trap Handler
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        echo "[ERROR] Log rotation script failed unexpectedly with code: $exit_code" >&2
    fi
}
trap cleanup EXIT

# Ensure input arguments are supplied
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <environment-name>"
    exit 1
fi

ENVIRONMENT="$1"
echo "[INFO] Running Log Backup for Environment: ${ENVIRONMENT}"

# Create operational mock directories
mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"

# Generate mock data files
echo "Application startup OK" > "${LOG_DIR}/app.log"
echo "Database connection established" >> "${LOG_DIR}/app.log"

# Perform compressed archive backup
ARCHIVE_NAME="logs_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "${LOG_DIR}" .

echo "[SUCCESS] Backup complete: ${BACKUP_DIR}/${ARCHIVE_NAME}"
ls -lh "${BACKUP_DIR}/${ARCHIVE_NAME}"
EOF

# Step 2: Make the script executable
chmod +x /tmp/backup_logs.sh

# Step 3: Run the script successfully with arguments
/tmp/backup_logs.sh production

# Step 4: Clean up temporary test files
rm -rf /tmp/backup_logs.sh /tmp/mock_app_logs /tmp/mock_app_backups
```

## Common Mistakes
- **Unquoted Variables:** Writing `rm -rf $DIR/logs` instead of `rm -rf "${DIR}/logs"`. If `$DIR` is empty or contains spaces, this command can delete unintended root directory files.
- **Omitting `set -euo pipefail`:** By default, Bash continues executing subsequent lines of a script even if previous critical setup commands failed.
- **Using single brackets `[ ]` instead of double brackets `[[ ]]`:** Single bracket `[` execution is a POSIX binary utility with limited string handling and sensitive variable expansion issues; double brackets `[[ ]]` offer safer native shell evaluation.

---

## Interview Questions

### 1. What is the operational difference between `/proc`, `/sys`, and `/dev` filesystems?
`/proc`, `/sys`, and `/dev` are pseudo-filesystems that do not store files on persistent block devices. 
- `/proc` (procfs) exposes dynamic kernel execution state, process memory structures, CPU metadata, and network state abstractions.
- `/sys` (sysfs) exposes structured kernel configurations representing physical attached hardware topology, kernel driver parameters, and device power management settings.
- `/dev` (devtmpfs/tmpfs) holds device node entries (e.g., `/dev/sda1`, `/dev/urandom`, `/dev/null`) that map input/output operations directly to software abstractions or hardware devices.

### 2. A system process is stuck in process state 'D'. Can you terminate it using `kill -9`? Why or why not?
No. State `D` represents Uninterruptible Sleep, typically caused by a thread blocked on synchronous hardware I/O (e.g., waiting for raw storage array reads or deadlocked NFS mounts). Processes in state `D` cannot handle incoming signals (including non-catchable signals like `SIGKILL`). The kernel will deliver the signal only after the blocked device driver call returns. To clear the process, you must resolve the underlying hardware/storage dependency or reboot the node.

### 3. What is the difference between SUID, SGID, and the Sticky Bit? Give a practical SRE use case for each.
- **SUID (`u+s`, numeric 4000):** Executes an executable binary with the privileges of the *file owner*. Use case: The `/usr/bin/passwd` utility allows standard unprivileged users to modify `/etc/shadow` securely.
- **SGID (`g+s`, numeric 2000):** Executables run with privileges of the *file group*. When applied to a directory, newly created child files automatically inherit the parent directory's owning group. Use case: Shared multi-tenant application deployments across engineers.
- **Sticky Bit (`+t`, numeric 1000):** Restricts file deletion/renaming within a shared directory strictly to the file owner or root user. Use case: The shared system temporary directory `/tmp`.

### 4. Why should production Bash scripts include `set -euo pipefail`?
`set -euo pipefail` sets strict execution safety boundaries:
- `-e`: Forces the script to terminate immediately if any command returns a non-zero exit code, preventing cascading failures.
- `-u`: Triggers an exit when referencing an uninitialized variable, catching typos and preventing disastrous execution errors like `rm -rf "${UNSET_VAR}/*"`.
- `-o pipefail`: Configures pipelines to fail if *any* command in the pipeline fails, rather than inheriting the exit status of only the final command in the chain.

### 5. Explain the difference between `SIGTERM` (15) and `SIGKILL` (9). Why is `SIGTERM` preferred during container teardowns?
`SIGTERM` requests standard, graceful termination. It allows the targeted process to execute signal handlers to release database connections, clean up lock files on disk, flush memory buffers, and disconnect client connections gracefully. `SIGKILL` forces immediate termination directly at the kernel scheduler level; the target application cannot intercept it or run cleanup routines. Standard orchestrators like Kubernetes issue `SIGTERM` first, allowing a grace period before issuing `SIGKILL`.

### 6. What does a process state of 'Z' (Zombie) mean? How do you eliminate a zombie process from the system?
A Zombie process (`Z` state) is a process that has finished execution but still holds an entry in the system process table because its parent process has not yet read its exit status code via the `wait()` system call. Zombie processes consume no CPU or RAM allocations, but consume available system PIDs. You cannot kill a zombie directly with signals (`kill -9` has no effect because the process is already dead). To remove a zombie, you must signal its parent process (`SIGHUP`/`SIGCHLD`) to force it to reap the child, or kill the parent process entirely so PID 1 (`systemd`) adopts and reaps the orphaned zombie.

### 7. How do you find and list all files under `/var/log` larger than 100MB that were modified more than 7 days ago?
```bash
find /var/log -type f -size +100M -mtime +7 -exec ls -lh {} +
```
This evaluates regular files (`-type f`) under `/var/log` matching size thresholds exceeding 100 Megabytes (`-size +100M`) and modification timestamps older than 7 days (`-mtime +7`), executing detailed file listing (`ls -lh`) against matches.

### 8. Explain the numeric permission value `2755` on a directory.
- `2`: Sets the **SGID** bit (Set Group ID). New files created within this directory inherit the group ownership of the directory rather than the primary group of the user who created the file.
- `7`: User (Owner) receives Read (4), Write (2), and Execute (1) permissions.
- `5`: Group receives Read (4) and Execute (1) permissions.
- `5`: Others receive Read (4) and Execute (1) permissions.

### 9. What is the difference between `ps aux` and `ps -ef`?
Both commands output system-wide process listings, but use different option syntax standards:
- `ps aux` follows BSD-style syntax (without leading dashes). `a` lists processes for all users, `u` supplies user-oriented output format (CPU/Memory usage stats), and `x` includes processes running without an attached controlling terminal.
- `ps -ef` follows UNIX/POSIX Standard syntax (with leading dashes). `-e` selects all active processes, and `-f` presents full-format listing detailing Parent Process IDs (PPID) and complete process parameter arguments.

### 10. How does `umask` affect default file creation permissions? If umask is `027`, what are default permissions for new files and directories?
`umask` subtracts permission bits from system default defaults (Files = `666`, Directories = `777`).
For `umask 027`:
- **New Directory Permissions:** `777 - 027 = 750` (`rwxr-x---`). Owner gets full access (`rwx`), Group gets read/execute access (`r-x`), Others get no access (`---`).
- **New File Permissions:** `666 - 027` (applying bitwise mask logic): Base `666` (`rw-rw-rw-`) masked with `027` (`---rwxrwx` inverted) yields `640` (`rw-r-----`). Owner gets read/write (`rw-`), Group gets read-only (`r--`), Others get no access (`---`).

---

## Quick Revision

- ✅ **Root Hierarchy:** All Linux resources reside under the single root directory `/`.
- ✅ **Runtime Metadata:** Inspect live running kernel states and system parameters in `/proc` and `/sys`.
- ✅ **Configuration Files:** Global application configuration settings live under `/etc`.
- ✅ **Dynamic Logs & Data:** Dynamic files, spool state, and logs live under `/var/log`.
- ✅ **Binary Execution:** Core binaries live in `/bin`, `/usr/bin`, and custom binaries in `/usr/local/bin`.
- ✅ **Permissions Structure:** User, Group, and Others sets use Read (4), Write (2), and Execute (1) bits.
- ✅ **Directory Traverse:** Directory read (`r`) allows listing contents; directory execute (`x`) is required to enter or traverse paths (`cd`).
- ✅ **Special Permissions:** SUID (`4000`), SGID (`2000`), and Sticky Bit (`1000`) grant elevated context or safe file creation rules.
- ✅ **Default Umask:** Formula calculates default file creation permissions by masking baseline values (`666` files, `777` dirs).
- ✅ **Process Inspection:** Use `ps aux` for a snapshot, `top`/`htop` for live resource tracking, and `pgrep` to search PIDs.
- ✅ **Process States:** State `R` is Running, `S` is Sleeping, `D` is Uninterruptible Storage I/O Wait, and `Z` is a Zombie.
- ✅ **Signal Control:** Signal `15` (`SIGTERM`) performs a graceful shutdown; Signal `9` (`SIGKILL`) forces immediate kernel-level termination.
- ✅ **Graceful Reaps:** Clear Zombie processes by signaling or terminating the parent process, allowing PID 1 to clean up.
- ✅ **Script Guardrails:** Always specify `set -euo pipefail` at the start of scripts for strict error handling.
- ✅ **Script Variable Security:** Always quote variables (`"${VAR}"`) to prevent word-splitting bugs and unwanted shell expansion.
- ✅ **Exit Status Codes:** Shell commands return `0` for success and non-zero values (`1-255`) for errors, tracked via `$?`.