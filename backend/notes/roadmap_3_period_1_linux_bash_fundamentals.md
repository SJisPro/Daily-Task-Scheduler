# Linux File System Hierarchy

## Overview
The Linux File System Hierarchy Standard (FHS) defines the structure and directory contents in Linux operating systems. Unlike Windows, which uses drive letters (`C:`, `D:`), Linux represents everything under a single unified root directory denoted by a forward slash (`/`). In modern cloud infrastructure and SRE environments, understanding this layout is essential for locating system configuration files, troubleshooting log accumulations, managing mounted volumes, and maintaining application workloads.

## Why Learn Linux File System Hierarchy?
- **Cloud & Container Operations:** Kubernetes volumes, Docker bind mounts, and cloud infrastructure block storage map directly to specific directories in this hierarchy.
- **Incident Management:** SREs must quickly navigate to system logs (`/var/log`), runtime sockets (`/run`), and configuration settings (`/etc`) during critical outages.
- **Troubleshooting & Capacity Planning:** Identifying root cause issues like disk space exhaustion requires understanding where dynamic data lives (`/var`, `/tmp`) versus static binaries (`/usr/bin`).
- **Interview Standard:** Questions regarding `/proc`, `/sys`, and directory layout standard compliance are fundamental in DevOps and SRE technical interviews.

## Architecture / How It Works
The Linux filesystem follows a inverted tree structure starting at the root directory `/`. All disks, partitions, remote network shares, and pseudo-filesystems are mounted as directories within this single tree.

```
                  / (Root Directory)
                  |
    +-------------+-------------+-------------+-------------+
    |             |             |             |             |
  /etc          /var          /usr          /proc         /home
  (Configs)     (Variable Data) (Binaries)  (Kernel/CPU)  (User Homes)
                  |             |
               /var/log      /usr/bin
               (Logs)        (Commands)
```

## Core Concepts

### Everything is a File
In Unix-like systems, regular files, directories, hardware devices (disks, terminals), network sockets, and kernel parameters are presented to users and applications as files. For instance, reading `/proc/cpuinfo` returns hardware specifications, while writing to `/dev/pts/0` sends characters directly to a terminal session.

### Virtual / Pseudo-Filesystems
Linux uses virtual filesystems that exist only in RAM and are generated dynamically by the kernel:
- **`/proc`**: Exposes kernel parameters, memory usage, and running process information.
- **`/sys`**: Exposes device drivers, hardware state, and modern kernel subsystems.
- **`/dev`**: Contains device nodes representing attached physical and virtual hardware (e.g., `/dev/sda`, `/dev/null`).

| Directory Path | Purpose / Description | Data Type |
| :--- | :--- | :--- |
| `/` | Primary root directory; top of the entire filesystem hierarchy. | Static / Core |
| `/etc` | Host-specific system configurations and application config files. | Static / Text |
| `/var` | Variable data files (logs, databases, cache, spool files). | Dynamic |
| `/usr` | Multi-user utilities, user binaries, libraries, and documentation. | Read-Only / Static |
| `/proc` | Virtual filesystem representing kernel state and active processes. | Dynamic / In-Memory |
| `/sys` | Virtual filesystem exposing hardware and kernel driver attributes. | Dynamic / In-Memory |
| `/dev` | System device files (hard drives, pseudo-devices like `/dev/null`). | Special Files |
| `/tmp` | Temporary files removed on reboot or cleared by system timers. | Temporary |

## File System / Directory Structure
Standard Linux Filesystem Layout (FHS standard):

```
/
├── bin -> usr/bin          # Essential command binaries (symlinked on modern OS)
├── boot/                   # Static files of the bootloader (vmlinuz, initramfs)
├── dev/                    # Device nodes (e.g., dev/sda, dev/urandom)
├── etc/                    # System-wide configuration files
│   ├── nginx/              # Web server configuration
│   └── systemd/            # Service unit configurations
├── home/                   # Home directories for non-root users
├── lib -> usr/lib          # Shared libraries essential for basic binaries
├── media/                  # Mount point for removable media (USB, CD-ROM)
├── mnt/                    # Temporary mount point for filesystems
├── opt/                    # Add-on application software packages
├── proc/                   # Kernel & process information virtual directory
├── root/                   # Home directory for the root superuser
├── run/                    # Run-time variable data (PID files, sockets)
├── sbin -> usr/sbin        # Essential system administration binaries
├── sys/                    # Kernel drivers and system device hardware tree
├── tmp/                    # Temporary files (cleared across reboots)
├── usr/                    # Secondary hierarchy for read-only user data
│   ├── bin/                # Non-essential user binaries
│   └── local/              # Local hierarchy for binaries compiled from source
└── var/                    # Variable files written during normal system operation
    ├── log/                # System and service log files
    └── lib/                # Persistent database state and variable library data
```

## Most Used Commands

### Navigation / Basics
```bash
ls -la /              # List detailed information including hidden files for root
cd /var/log           # Change current directory to system log directory
pwd                   # Print current working directory absolute path
tree -L 2 /etc        # Display directory structure of /etc up to 2 levels deep
```

### Advanced / Operations
```bash
df -h                 # Display disk space utilization in human-readable format
du -sh /var/log/*     # Show summary disk usage for each item in /var/log
find /var -name "*.log" # Search for files matching pattern under /var
```

## Mini Example
Investigating high disk usage on a server and locating large log files in `/var/log`:

```bash
# Step 1: Check overall filesystem usage to locate the full partition
df -h /

# Step 2: Navigate to the dynamic variable data directory
cd /var/log

# Step 3: Find top 5 largest files in /var/log to pinpoint disk hogs
du -ah . | sort -rh | head -n 5

# Step 4: Verify process actively holding the large file open
lsof +L1 /var/log
```

## Common Mistakes
- **Deleting files in `/proc` or `/sys` manually:** These are in-memory kernel virtual files. Attempting to delete them with `rm -rf` will fail or cause unexpected kernel errors.
- **Filling up root partition (`/`) with dynamic logs:** Failing to isolate `/var/log` on a separate partition or mount point can cause log flooding to fill up `/`, taking down the system.
- **Confusing `/opt` with `/usr/local`:** Vendor-supplied monolithic third-party software goes in `/opt`, whereas manually compiled custom applications generally belong in `/usr/local`.

---

# File Permissions and Ownership

## Overview
Linux operates a multi-user security architecture where access to every file and directory is controlled by explicit ownership and permission bits. Permissions define whether a process can **read**, **write**, or **execute** a resource based on the identity of the user running the process. In production SRE workflows, proper permission management enforces principle of least privilege, preventing unauthorized access, data corruption, or security breaches in containerized and cloud environments.

## Why Learn File Permissions and Ownership?
- **Security Compliance:** Restricting access to sensitive configuration files (e.g., SSH keys, API credentials, database strings).
- **Debugging Deployment Failures:** "Permission Denied" errors are among the top causes of failed CI/CD pipeline runs and application container crashes.
- **Container Security Contexts:** Understanding how Non-Root containers and User Namespaces (UID/GID mapping) interface with host filesystems.
- **Interview Frequency:** Explaining permission bit calculations, `umask`, and special flags (SUID/SGID/Sticky Bit) is standard practice in SRE interviews.

## Architecture / How It Works
Every file in Linux is associated with a specific User Owner (**u**), a Group Owner (**g**), and an Others category (**o**). File mode evaluation occurs sequentially: if the executing identity matches the User Owner, User permissions apply; if not, but the identity belongs to the Group Owner, Group permissions apply; otherwise, Others permissions apply.

```
File Mode Layout:  drwxr-xr--
                   ||  |  |
                   ||  |  +--> Others Permissions (r--) [Read Only]
                   ||  +-----> Group Permissions  (r-x) [Read & Execute]
                   |+--------> Owner Permissions  (rwx) [Read, Write, Execute]
                   +---------> File Type Indicator (d = Directory, - = Regular File)
```

## Core Concepts

### Permission Modes and Values
Permissions are defined using symbolic syntax (`r`, `w`, `x`) or numeric octal representation (4, 2, 1):

| Permission | Symbol | Octal Value | Meaning on File | Meaning on Directory |
| :--- | :--- | :--- | :--- | :--- |
| **Read** | `r` | `4` | View contents of file | List files inside directory (`ls`) |
| **Write** | `w` | `2` | Modify file contents | Create, delete, rename files inside |
| **Execute** | `x` | `1` | Run file as executable binary/script | Enter directory (`cd`) and access metadata |

### Special Permissions
- **SUID (Set User ID - Octal 4000):** Executable runs with the privileges of the file owner, not the user running it (e.g., `/usr/bin/passwd`).
- **SGID (Set Group ID - Octal 2000):** Files created inside a directory inherit the group ownership of the directory, rather than the user's primary group.
- **Sticky Bit (Octal 1000):** Prevents users from deleting or renaming files inside a shared directory unless they own the file (e.g., `/tmp`).

## Permissions / Configuration

### Calculating Octal Permissions
Octal permissions are calculated by summing the binary values for User, Group, and Others independently.

```
Example: chmod 750 /opt/app/start.sh

 User  (7): 4 + 2 + 1 = rwx (Read, Write, Execute)
 Group (5): 4 + 0 + 1 = r-x (Read, Execute)
 Other (0): 0 + 0 + 0 = --- (No Access)
```

## Most Used Commands

### Navigation / Basics
```bash
ls -la /etc/shadow      # Check permissions, owner, group of a file
stat /etc/hosts         # Display granular file permissions in octal and symbolic form
```

### Advanced / Operations
```bash
chmod 640 secrets.env   # Set read/write for owner, read for group, none for others
chmod -R 755 /var/www   # Recursively apply permissions to directory and contents
chown appuser:appgroup file.log # Change both file owner and group ownership
chown -R appuser /opt/app       # Recursively change ownership of directory
umask 022               # Set default mask for new files (creates 644 files / 755 dirs)
```

## Mini Example
Securing an application configuration directory containing sensitive credentials:

```bash
# Step 1: Create application service user and directory
sudo useradd -r -s /bin/false apprunner
sudo mkdir -p /etc/myapp

# Step 2: Create a dummy secrets configuration file
echo "DATABASE_URL=postgres://user:pass@localhost:5432/db" | sudo tee /etc/myapp/config.env

# Step 3: Change ownership to apprunner user and group
sudo chown -R apprunner:apprunner /etc/myapp

# Step 4: Restrict permissions so ONLY apprunner can read/write directory contents
sudo chmod 700 /etc/myapp
sudo chmod 600 /etc/myapp/config.env

# Step 5: Verify permissions applied correctly
ls -ld /etc/myapp
ls -l /etc/myapp/config.env
```

## Common Mistakes
- **Using `chmod 777` to solve permission issues:** Granting full read/write/execute rights to everyone bypasses system security, exposes systems to attacks, and breaks software like SSH which enforces strict permission models.
- **Forgetting `+x` on directories:** Removing execute permissions from a directory prevents users from changing into it (`cd`), even if read permissions (`r`) are granted.
- **Octal permissions miscalculation with special bits:** Writing `chmod 777` instead of `chmod 1777` on shared directories removes the Sticky Bit, enabling users to delete each other's files.

---

# Process Management (ps, top, kill)

## Overview
A process is an instance of an executing program in memory. Linux manages processes via unique Process Identifiers (PIDs) using the kernel scheduler. Process management involves monitoring resource utilization (CPU, RAM, I/O), modifying process priorities, and sending signals to instruct processes to reconfigure, terminate, or abort. In SRE practice, effective process management is crucial for isolating resource exhaustion, handling hung services, and ensuring application stability.

## Why Learn Process Management?
- **Resource Exhaustion Debugging:** Identifying high CPU spin loops, memory leaks, and Out-Of-Memory (OOM) conditions in production servers.
- **Graceful Application Lifecycle Management:** Terminating non-responsive containers or worker processes smoothly without dropping database connections.
- **Background Job Execution:** Managing long-running batch jobs and decoupled asynchronous tasks.
- **Production Incidents:** Responding quickly to rogue processes causing host degraded performance.

## Architecture / How It Works
Process execution starts with the init system (`systemd`, PID 1). Every process inherits attributes from its parent process (PPID). Processes move through distinct states in their lifecycle:

```
                  +--------------------+
                  |    Fork / Create   |
                  +---------+----------+
                            |
                            v
+------------+       +--------------+       +------------+
|  Stopped   | <---> |   Running    | <---> |  Sleeping  |
| (State: T) |       |  (State: R)  |       | (State: S) |
+------------+       +------+-------+       +------------+
                            |
                            v
                  +--------------------+
                  | Zombie (State: Z)  |
                  +---------+----------+
                            |
                            v
                  +--------------------+
                  | Reaped by Parent   |
                  +--------------------+
```

## Core Concepts

### Process States

| State Symbol | Name | Description |
| :--- | :--- | :--- |
| **R** | Running / Runnable | Process is actively executing on CPU or in run queue. |
| **S** | Interruptible Sleep | Process is waiting for an event or resource (e.g., I/O). |
| **D** | Uninterruptible Sleep | Process is waiting for hardware I/O; cannot respond to signals. |
| **Z** | Zombie | Process finished execution, but parent hasn't read its exit status. |
| **T** | Stopped | Process suspended by job control or tracing signal (`SIGSTOP`). |

### Linux Process Signals

| Signal Name | Number | Standard Action | SRE Use Case |
| :--- | :--- | :--- | :--- |
| **SIGHUP** | `1` | Terminate (or Reload) | Instructs daemons (e.g., Nginx) to reload config without dropping sessions. |
| **SIGINT** | `2` | Interrupt | Triggered by `Ctrl + C` in terminal to cancel a foreground task. |
| **SIGKILL** | `9` | Immediate Termination | Uncatchable kernel-level immediate kill. Useful as last resort. |
| **SIGTERM** | `15` | Graceful Termination | Standard shutdown signal allowing process to release resources before exiting. |

## Most Used Commands

### Inspection / Monitoring
```bash
ps aux                    # Display snapshot of all running processes in BSD syntax
ps -ef                    # Display snapshot of processes showing PPID parent relationships
top                       # Real-time interactive resource and process viewer
htop                      # Enhanced, colored, interactive process manager (if installed)
pgrep -u appuser node     # Output PIDs of 'node' processes owned by 'appuser'
```

### Control / Execution
```bash
kill -15 4521             # Send SIGTERM (graceful shutdown) to PID 4521
kill -9 4521              # Send SIGKILL (force termination) to PID 4521
pkill -f "python worker"  # Kill processes matching command-line pattern
renice -n 10 -p 4521      # Change priority of process (higher value = lower CPU priority)
bg %1                     # Resume suspended job in background
fg %1                     # Bring background job to foreground
```

## Mini Example
Locating and gracefully terminating a rogue process consuming excessive resources:

```bash
# Step 1: Locate top 5 CPU-consuming processes using ps
ps aux --sort=-%cpu | head -n 6

# Step 2: Find PID of specific stuck process (e.g., Python script)
PGPID=$(pgrep -f "python heavy_script.py")
echo "Target PID: ${PGPID}"

# Step 3: Attempt graceful termination (SIGTERM)
kill -15 ${PGPID}

# Step 4: Wait 3 seconds and check if process exited
sleep 3
if ps -p ${PGPID} > /dev/null; then
    echo "Process did not stop gracefully, issuing SIGKILL..."
    kill -9 ${PGPID}
else
    echo "Process terminated successfully."
fi
```

## Common Mistakes
- **Defaulting to `kill -9` immediately:** Sending `SIGKILL` prevents applications from saving state, flushing write buffers, releasing locks, or closing active network connections cleanly.
- **Ignoring Zombie processes (`Z` state):** Zombie processes do not consume memory or CPU, but they consume available PIDs in the process table. They can only be resolved by fixing the parent process or killing the parent.
- **Trying to kill processes in `D` state:** Processes in Uninterruptible Sleep are waiting on disk or network hardware I/O and cannot handle signals until the kernel hardware call returns.

---

# Shell Scripting Basics

## Overview
Shell scripting involves automating command-line operations using Bash (Bourne Again SHell) syntax. Scripts execute sequentially inside the shell interpreter, enabling task automation, system state checks, output processing, and administrative orchestration. In modern Full-Stack and SRE roles, Bash scripts power container initialization wrappers, deployment automation, operational health checks, and CI/CD pipelines.

## Why Learn Shell Scripting?
- **CI/CD Pipeline Automation:** Automating build, test, package, and deployment stages across GitHub Actions, GitLab CI, or Jenkins.
- **Container Entrypoints:** Custom Docker `entrypoint.sh` scripts that dynamically parse environment variables and run pre-flight database migrations.
- **Incident Mitigation:** Rapidly authoring diagnostic and automated remediation scripts during operational crises.
- **Glue Code:** Integrating heterogeneous command-line tools (`curl`, `jq`, `sed`, `awk`) seamlessly.

## Architecture / How It Works
When a script executes, the shell reads the Shebang line (`#!/usr/bin/env bash`), forks a subshell environment, parses code top-to-bottom, executes commands, handles input/output streams, and returns an exit status code (`0` for success, non-zero for failure) to the parent shell.

```
+-------------------------------------------------+
|               Parent Process / Shell            |
|  $ ./script.sh                                  |
+------------------------+------------------------+
                         |
                         v (Forks Subshell)
+-------------------------------------------------+
| Subshell Bash Interpreter                        |
|                                                 |
| [STDIN - 0] ---> [ Script Logic ] ---> [STDOUT - 1]
|                         |                       |
|                         +------------> [STDERR - 2]
+------------------------+------------------------+
                         |
                         v
                Exit Code ($? = 0-255)
```

## Core Concepts

### Exit Codes and Execution Control
Every command returns an exit code between `0` and `255`:
- **`0`**: Success.
- **`1 - 255`**: Failure (Specific code indicates error conditions).

Control flags like `set -e` halt script execution immediately if any command fails, preventing cascading failures.

### Standard Streams and Redirection

| Stream | Name | Default Destination | Redirection Syntax |
| :--- | :--- | :--- | :--- |
| **0** | STDIN | Keyboard | `< input.txt` |
| **1** | STDOUT | Terminal Screen | `> file.log` (Overwrite) / `>> file.log` (Append) |
| **2** | STDERR | Terminal Screen | `2> error.log` |
| **1 & 2** | Combined | Terminal Screen | `> file.log 2>&1` or `&> file.log` |

## Most Used Commands

### Scripting Control Commands
```bash
bash -n script.sh    # Syntax check without executing script
bash -x script.sh    # Execute script in debug mode (prints commands line-by-line)
read -p "Enter: " VAR # Prompt user for input and save in VAR variable
test -f /etc/passwd  # Check if file exists (returns exit code 0 if true)
echo $?              # Print exit status code of the last executed command
```

## Mini Example
A production-grade web service health-check script with safety flags and conditional exit codes:

```bash
#!/usr/bin/env bash

# Enforce strict error handling:
# -e: exit on command error
# -u: exit on unset variable usage
# -o pipefail: catch failures inside piped commands
set -euo pipefail

# Configuration variables
TARGET_URL="${1:-https://httpbin.org/status/200}"
LOG_FILE="/tmp/service_health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Health check started at ${TIMESTAMP} ===" >> "${LOG_FILE}"

# Function to write logs
log_message() {
    local MESSAGE="$1"
    echo "[${TIMESTAMP}] ${MESSAGE}" | tee -a "${LOG_FILE}"
}

# Perform HTTP health check request
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${TARGET_URL}" || true)

# Process HTTP status logic
if [ "${HTTP_STATUS}" -eq 200 ]; then
    log_message "SUCCESS: ${TARGET_URL} returned HTTP ${HTTP_STATUS}"
    exit 0
else
    log_message "ERROR: ${TARGET_URL} returned HTTP ${HTTP_STATUS}"
    exit 1
fi
```

## Common Mistakes
- **Unquoted Variables:** Writing `if [ $VAR == "val" ]` breaks if `$VAR` contains spaces or is empty. Always write `if [[ "${VAR}" == "val" ]]`.
- **Missing Safety Flags (`set -e`):** Failing to include `set -e` causes scripts to continue running subsequent destructive commands even if prior setup commands failed.
- **Hardcoding Temporary Files:** Writing output directly to `/tmp/output.txt` creates security vulnerabilities and race conditions. Use `mktemp` to generate safe unique paths instead.

---

# Cron Jobs and Scheduling

## Overview
`cron` is a background daemon that executes scheduled commands at specified times and intervals. Cron configurations are stored in system tables (`crontab` files) defining task frequency, user privileges, and executable paths. In production environments, scheduled execution automates tasks such as daily backups, periodic health assessments, log rotation, and data cleanups.

## Why Learn Cron Jobs?
- **Operational Automation:** Scheduling periodic operational routines (e.g., database dumps, cache warming, TLS certificate checks).
- **Resource Management:** Deferring resource-heavy tasks (e.g., analytical aggregation) off-peak hours.
- **Container Schedulers:** Understanding native cron mechanics underpins Kubernetes `CronJobs` and cloud serverless event triggers.
- **Incident Response:** Debugging silent failures of critical background jobs due to missing execution paths or missing environment variables.

## Architecture / How It Works
The `crond` background daemon wakes up every minute, checks configuration files in `/etc/crontab`, `/etc/cron.d/`, and `/var/spool/cron/crontabs/`, and spawns child processes for any scheduled jobs matching the current time criteria.

```
       +------------------------------------+
       |   crond Daemon (Wakes every 60s)   |
       +-----------------+------------------+
                         |
           Reads Configuration Sources
                         |
   +---------------------+---------------------+
   |                                           |
   v                                           v
System Crontabs                             User Crontabs
(/etc/crontab, /etc/cron.d/)                (/var/spool/cron/crontabs/<user>)
   |                                           |
   +---------------------+---------------------+
                         |
       Matches Current Minute Time Specs
                         |
                         v (Spawns Subshell)
          Task Execution Environment
          (Default PATH=/usr/bin:/bin)
```

## Core Concepts

### Cron Schedule Format
Cron syntax consists of 5 time fields followed by the command to execute:

```
.---------------- minute (0 - 59)
|  .------------- hour (0 - 23)
|  |  .---------- day of month (1 - 31)
|  |  |  .------- month (1 - 12)
|  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7)
|  |  |  |  |
*  *  *  *  *  command_to_be_executed
```

### Cron Field Operators

| Operator | Description | Example | Meaning |
| :--- | :--- | :--- | :--- |
| **`*`** | Any / Every value | `* * * * *` | Run every minute |
| **`,`** | Value list separator | `0 8,12,16 * * *` | Run at 8:00, 12:00, and 16:00 |
| **`-`** | Value range specifier | `0 9-17 * * *` | Run hourly between 9:00 AM and 5:00 PM |
| **`/`** | Step value increment | `*/15 * * * *` | Run every 15 minutes |

## Permissions / Configuration
System permissions for scheduling are governed by security restriction files:
- **/etc/cron.allow**: If this file exists, only listed users can edit crontabs.
- **/etc/cron.deny**: If `cron.allow` does not exist, users listed here are blocked from editing crontabs.

## Most Used Commands

### Crontab Management
```bash
crontab -l                 # Display active user's current crontab entries
crontab -e                 # Edit active user's crontab using default editor
crontab -r                 # Remove all cron entries for the active user
crontab -u appuser -l      # Display crontab contents for specific user (requires root)
```

## Mini Example
Configuring a reliable, logged database backup job running every night at 2:30 AM:

```bash
# Step 1: Create backup target directory and script file
sudo mkdir -p /var/backups/db
cat << 'EOF' | sudo tee /usr/local/bin/db_backup.sh
#!/usr/bin/env bash
set -euo pipefail
BACKUP_PATH="/var/backups/db/backup_$(date +%Y%m%d_%H%M%S).sql.gz"
# Simulate database dump write
echo "Dumping database contents..." > "${BACKUP_PATH}"
echo "Backup saved successfully to ${BACKUP_PATH}"
EOF

# Step 2: Ensure backup script is executable
sudo chmod +x /usr/local/bin/db_backup.sh

# Step 3: Add cron schedule entry via temporary file
# Format: Min(30) Hour(2) EveryDay EveryMonth EveryDayOfWeek
crontab -l 2>/dev/null > /tmp/mycron || true
echo "30 2 * * * /usr/local/bin/db_backup.sh >> /var/log/db_backup.log 2>&1" >> /tmp/mycron
crontab /tmp/mycron
rm /tmp/mycron

# Step 4: Verify cron entry installed
crontab -l
```

## Common Mistakes
- **Assuming Shell Environment Pathing:** Cron runs with a restricted execution environment (`PATH=/usr/bin:/bin`). Commands using non-standard binary locations (e.g., `/usr/local/bin/node`) will fail unless explicitly path-qualified.
- **Uncaptured Command Output:** Uncaptured `stdout` and `stderr` can cause cron to flood local MTA mail spools (`/var/mail`). Always redirect execution output explicitly: `>> /path/to/log.log 2>&1`.
- **Special Syntax Escalation (`%` symbol):** The `%` character inside cron commands acts as a literal newline character unless escaped with a backslash (`\%`).

---

# Systemd and Service Management

## Overview
`systemd` is the standard init system and service manager for modern Linux operating systems. Running as PID 1, it initializes the operating system, parallelizes system service startup, manages background daemons, monitors dependencies, and handles system state targets. In modern cloud environments, systemd ensures long-running applications stay alive, manage memory caps, auto-restart upon crashing, and stream logs cleanly to standard monitoring solutions.

## Why Learn Systemd?
- **Production Service Lifecycle:** Defining, deploying, and maintaining web apps, databases, and microservices as reliable system services.
- **Automatic Recovery:** Configuring robust auto-restart rules so services automatically recover from unexpected crashes.
- **Log Aggregation:** Utilizing `journalctl` to inspect binary structured logs, inspect error traces, and monitor real-time outputs across application boundaries.
- **Container Base Images:** Managing multi-service legacy workloads or VM-based workloads on AWS EC2/GCP Compute instances.

## Architecture / How It Works
`systemd` structures system resources using Unit Files. During boot, systemd loads the primary target (e.g., `multi-user.target`), calculates dependency graphs, and executes required unit files concurrently.

```
                    +-----------------------+
                    |  Linux Kernel Boots   |
                    +-----------+-----------+
                                |
                                v
                    +-----------------------+
                    |  systemd (PID 1)      |
                    +-----------+-----------+
                                |
          +---------------------+---------------------+
          |                     |                     |
          v                     v                     v
+------------------+  +------------------+  +------------------+
|  nginx.service   |  | postgres.service |  | docker.service   |
+------------------+  +------------------+  +------------------+
          \                     |                     /
           +--------------------+--------------------+
                                |
                                v
                    +-----------------------+
                    | journald (Log Engine) |
                    +-----------------------+
```

## Core Concepts

### Systemd Unit Types
- **`.service`**: Background daemons and applications.
- **`.target`**: Groupings of units forming system boot states (e.g., `multi-user.target` for multi-user CLI mode).
- **`.socket`**: Inter-Process Communication (IPC) or network socket triggers.
- **`.timer`**: Schedules service execution (modern alternative to cron).

### Service Execution Types (`Type=`)
- **`simple`**: Default. Systemd considers service started immediately after fork of `ExecStart` process.
- **`exec`**: Considered started only when service binary execution begins.
- **`forking`**: Expects service process to fork off a background child process and parent to exit (legacy daemons).
- **`oneshot`**: Process runs to completion before systemd continues starting subsequent units.

## File System / Directory Structure
Systemd unit file resolution hierarchy (highest precedence first):

```
/etc/systemd/system/        # Administrator custom unit overrides (Highest Priority)
/run/systemd/system/        # Dynamic runtime generated units
/lib/systemd/system/        # System package installed default units (Lowest Priority)
```

## Most Used Commands

### Service Management (`systemctl`)
```bash
systemctl start nginx               # Start service immediately
systemctl stop nginx                # Stop running service
systemctl restart nginx             # Restart service immediately
systemctl reload nginx              # Reload service configuration without full restart
systemctl status nginx              # Display runtime status and recent logs for service
systemctl enable nginx              # Enable service to start automatically at boot
systemctl disable nginx             # Prevent service from auto-starting at boot
systemctl daemon-reload             # Reload systemd manager configuration after editing unit files
```

### Log Inspection (`journalctl`)
```bash
journalctl -u nginx                 # Read logs specifically for nginx service
journalctl -u nginx -f              # Follow (tail) live log stream for nginx service
journalctl -u nginx --since "1h ago"# View service logs from the last hour
journalctl -p err                   # Show logs filtered by Priority Level 'Error'
journalctl -b                       # View logs generated during current boot session
```

## Mini Example
Authoring, installing, enabling, and monitoring a production Node.js API systemd service:

```bash
# Step 1: Create service unit file in /etc/systemd/system/
cat << 'EOF' | sudo tee /etc/systemd/system/api-server.service
[Unit]
Description=Backend API Node.js Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/api
ExecStart=/usr/bin/node /var/www/api/index.js
Restart=on-failure
RestartSec=5s
Environment=NODE_ENV=production PORT=8080

[Install]
WantedBy=multi-user.target
EOF

# Step 2: Reload systemd configuration to register the new unit file
sudo systemctl daemon-reload

# Step 3: Enable service for boot autostart and start it now
sudo systemctl enable --now api-server.service

# Step 4: Verify detailed operational status
sudo systemctl status api-server.service

# Step 5: Check live runtime output via journalctl
sudo journalctl -u api-server.service -n 20 --no-pager
```

## Common Mistakes
- **Forgetting `systemctl daemon-reload`:** Modifying unit configuration files on disk without reloading systemd leaves memory state out of sync, causing subsequent operations to execute old configurations.
- **Editing files in `/lib/systemd/system/` directly:** Package managers overwrite unit files in `/lib/` during upgrades. Custom overrides belong inside `/etc/systemd/system/`.
- **Misconfiguring `Type=simple` for daemonizing processes:** If a service forks itself into the background, setting `Type=simple` causes systemd to lose track of the actual running PID and report service failures.

---

## Interview Questions

1. **What is the difference between `/proc` and `/sys` virtual filesystems?**
   - *Answer:* Both are in-memory pseudo-filesystems generated dynamically by the Linux kernel. `/proc` primarily exposes process metadata (PIDs), CPU/memory metrics, and runtime kernel state configuration parameters. `/sys` was introduced later (SysFS) to provide a structured, hierarchical object model representing hardware infrastructure, dynamic device drivers, and system device trees.

2. **Explain the difference between SUID, SGID, and Sticky Bit permission settings.**
   - *Answer:* SUID (octal 4000) causes an executable file to run with privileges of the file owner rather than the executing user. SGID (octal 2000) causes created files inside a directory to inherit the directory's group ownership. Sticky Bit (octal 1000) placed on a directory prevents users from deleting or renaming files owned by others.

3. **How do you calculate permissions if `umask` is set to `027`?**
   - *Answer:* Default permissions are `666` for files and `777` for directories. Applying a mask of `027` subtracts bits:
     - New Directory: `777 - 027 = 750` (`rwxr-x---`).
     - New File: `666 - 027` (bitwise negation) gives `640` (`rw-r-----`).

4. **What is a Zombie process, and how do you resolve it?**
   - *Answer:* A Zombie process (`Z` state) occurs when a child process completes execution, but its parent process has not read its exit status using the `wait()` system call. Zombies do not consume RAM or CPU, but hold PIDs. They cannot be killed directly using `kill -9` because they are already dead. To resolve a Zombie, trigger the parent process to reap it, or terminate the parent process so `systemd` (PID 1) inherits and reaps it.

5. **What is the difference between `SIGTERM` (15) and `SIGKILL` (9)?**
   - *Answer:* `SIGTERM` requests a process to stop gracefully, allowing it to complete current operations, flush buffers, and release resources. The target process can catch or block `SIGTERM`. `SIGKILL` is handled directly by the kernel and cannot be caught, blocked, or ignored, causing immediate termination without cleanup.

6. **What does the `set -euo pipefail` command do in a Bash script?**
   - *Answer:* It enforces defensive execution mode:
     - `-e`: Causes the script to exit immediately if any command returns a non-zero exit status.
     - `-u`: Treats unset variables as an error and exits immediately.
     - `-o pipefail`: Forces a pipeline execution to return the exit status of the last command that returned a non-zero exit code (instead of defaulting to the exit code of the final command in the pipe chain).

7. **Why do cron jobs fail to run commands that execute successfully in an interactive terminal shell?**
   - *Answer:* Cron executes commands inside a stripped minimal subshell environment where the default `PATH` variable is restricted (typically only `/usr/bin:/bin`). Commands, tools, or binary versions installed in custom paths (e.g., `/usr/local/bin` or custom user paths) are not found unless fully qualified path names are declared or `PATH` is explicitly exported within the crontab file.

8. **Where should custom systemd unit files be placed, and what command must be executed after editing them?**
   - *Answer:* Custom systemd unit files must be placed in `/etc/systemd/system/` (which overrides default system package files in `/lib/systemd/system/`). After creating or editing a unit file, `systemctl daemon-reload` must be executed to refresh systemd's memory configuration graph.

9. **How can you find which process is locking a specific port or file?**
   - *Answer:* For network ports, run `sudo lsof -i :<PORT>` or `sudo ss -tulpn | grep :<PORT>`. For open files, run `sudo lsof /path/to/file`.

10. **What is the difference between standard output redirection `>` and `>>`?**
    - *Answer:* The `>` operator overwrites target file contents with standard output streams, truncating existing data. The `>>` operator appends standard output streams to the end of the existing file contents without wiping past data.

---

## Quick Revision

✅ The Linux root directory `/` is the single base of the entire unified filesystem hierarchy.
✅ Virtual pseudo-filesystems `/proc` and `/sys` exist in RAM, providing dynamic access to kernel and hardware states.
✅ File access permission octals map to: Read (`4`), Write (`2`), and Execute (`1`).
✅ `chmod 755` provides read/write/execute rights to Owner, and read/execute rights to Group and Others.
✅ `chown user:group filename` changes both the User Owner and Group Owner simultaneously.
✅ Process states include Running (`R`), Interruptible Sleep (`S`), Uninterruptible Sleep (`D`), Stopped (`T`), and Zombie (`Z`).
✅ `kill -15` (SIGTERM) allows graceful process shutdown; `kill -9` (SIGKILL) forces immediate kernel-level termination.
✅ Shell standard execution streams map to numeric file descriptors: STDIN (`0`), STDOUT (`1`), STDERR (`2`).
✅ Shell script safety options `set -euo pipefail` prevent execution escalation when errors or missing variables occur.
✅ Cron schedule format consists of five position fields: `Minute Hour Day-of-Month Month Day-of-Week`.
✅ Cron default environment runs with a restricted execution `PATH`, requiring absolute paths for custom scripts and commands.
✅ Systemctl configuration changes to unit files inside `/etc/systemd/system/` require `systemctl daemon-reload` to update system state memory.
✅ `journalctl -u <service-name> -f` tails real-time application runtime logs managed by systemd.