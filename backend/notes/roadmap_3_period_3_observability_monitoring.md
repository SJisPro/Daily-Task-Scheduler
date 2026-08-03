# Logs, Metrics, and Traces

## Overview
Observability is the measure of how accurately you can infer the internal state of a system based on its external telemetry outputs. The three fundamental pillars of observability—logs, metrics, and traces—work together to provide visibility into distributed architectures. Logs detail discrete event contexts, metrics provide aggregate numerical measurements over time, and traces map request execution paths across service boundaries. Modern cloud-native environments rely on this triad to detect anomalies, isolate root causes, and evaluate system performance.

## Why Learn Logs, Metrics, and Traces?
- **Root-Cause Isolation**: Reduces Mean Time to Resolution (MTTR) by allowing SREs to move seamlessly from aggregated anomalies (metrics) to request flows (traces) and detailed context (logs).
- **High SRE Demand**: Core requirement for production engineering, platform engineering, and DevOps roles across enterprise environments.
- **Capacity Planning & Cost Control**: Provides data required to optimize resource allocation and trim telemetry storage costs.
- **System Architecture Insight**: Essential for understanding cascading failures, latency bottlenecks, and edge failure modes in microservice environments.

## Architecture / How It Works
 telemetry data originates from application code and system runtime environments, flows through collection agents, and lands in dedicated persistence stores.

```
+-----------------------------------------------------------------+
|                       Application Layer                         |
+-----------------------+------------------+----------------------+
                        |                  |
                        v                  v
  [Structured Logs]   [Numeric Metrics]   [Trace Context Spans]
          |                  |                     |
          v                  v                     v
   (Fluentbit/Vector)   (Prometheus)           (OpenTelemetry)
          |                  |                     |
          v                  v                     v
    Elasticsearch       Prometheus DB           Jaeger/Tempo
```

1. **Generation**: Applications emit logs via stdout/files, expose metric endpoints via HTTP, and inject trace headers into downstream network calls.
2. **Collection**: Daemonsets or sidecars (e.g., Vector, Fluentbit, OpenTelemetry Collector) scrape, parse, and batch telemetry payloads.
3. **Storage & Visualization**: Dedicated time-series, column-store, or document engines store telemetry data for query platforms like Grafana.

## Core Concepts

### Discrete Events vs. Aggregated Time-Series vs. Request Paths
- **Logs**: Record discrete, timestamped events. They provide rich contextual detail but incur high storage and indexing overhead.
- **Metrics**: Aggregated numerical data points recorded over fixed time intervals. They are computationally efficient and ideal for real-time alerting.
- **Traces**: Represent the end-to-end execution graph of a request through a distributed network, composed of parent-child segments called **Spans**.

### Telemetry Comparison Matrix

| Property | Logs | Metrics | Traces |
| :--- | :--- | :--- | :--- |
| **Data Format** | JSON / Plain Text | Metric Name + Labels + Numeric Value + Timestamp | Trace ID + Span ID + Duration + Metadata |
| **Storage Cost** | High (Scales with event volume) | Low (Constant relative to metric cardinality) | Medium/High (Depends on sampling strategy) |
| **Primary Use Case** | Deep root-cause debugging | Real-time alerting and capacity trending | Identifying latency bottlenecks in microservices |
| **Query Mechanism** | Full-text search / Regex | PromQL / Time-series aggregations | Trace ID lookup / DAG graph traversal |

## File System / Directory Structure
System-level telemetry log locations and collector paths on standard Linux deployments:

```
/var/log/
├── syslog                 # General system log messages
├── auth.log               # Authentication and authorization logs
├── nginx/                 # Web server access and error logs
│   ├── access.log
│   └── error.log
└── vector/                # Unified telemetry collector directory
    ├── vector.yaml        # Main pipeline configuration
    └── data/              # Buffer storage directory on disk
```

| Path | Purpose |
| :--- | :--- |
| `/var/log/syslog` | Core OS diagnostic logs |
| `/var/log/nginx/` | Transport layer HTTP access and runtime error streams |
| `/etc/vector/vector.yaml` | Vector collector pipeline source/transform/sink definitions |
| `/var/lib/docker/containers/` | Default path for container standard output/error logs |

## Permissions / Configuration
The following `/etc/vector/vector.yaml` configuration reads container logs, extracts metrics, and routes data to destinations:

```yaml
sources:
  container_logs:
    type: "docker_logs"  # Scrapes logs directly from the Docker engine socket

transforms:
  parse_json:
    type: "remap"
    inputs: ["container_logs"]
    source: |
      . = parse_json!(.message)  # Parses incoming log payload into structured JSON
      .environment = "production"

sinks:
  elasticsearch_out:
    type: "elasticsearch"
    inputs: ["parse_json"]
    endpoints: ["http://elasticsearch.internal:9200"]  # Destination log engine endpoint
    mode: "bulk"
  
  prometheus_out:
    type: "prometheus_exporter"
    inputs: ["parse_json"]
    address: "0.0.0.0:9598"  # Exposes metrics parsed from logs on port 9598
```

Required system permissions:
- The logging daemon user (e.g., `vector`) must belong to the `docker` or `adm` system groups to read target logs:
  `usermod -aG adm vector` (Grants read permissions to `/var/log/`).

## Most Used Commands

### Navigation / Log Inspection
```bash
# Tail log stream live with line limit
tail -f -n 100 /var/log/syslog   # Output last 100 lines and follow additions

# Search compressed system logs for specific error patterns
zgrep -i "OOMKilled" /var/log/syslog*.gz   # Case-insensitive search inside gzipped archives

# View systemd service logs filtered by unit and time frame
journalctl -u nginx.service --since "1 hour ago" --no-pager   # Fetch 1-hour nginx logs
```

### Advanced / Processing JSON Logs
```bash
# Parse JSON logs, filter by HTTP status 500, and output method and path
cat /var/log/nginx/access.json | jq -r 'select(.status == 500) | "\(.method) \(.path)"'   # Extract failing endpoints

# Calculate top 10 requesting IP addresses from log file
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 10   # Aggregate unique IPs
```

## Mini Example
Isolate an application error from raw system logs using standard command-line tools.

```bash
# Step 1: Create a mock structured log file
cat << 'EOF' > /tmp/app.log
{"timestamp":"2026-03-30T10:00:01Z","level":"info","trace_id":"a1b2c3d4","status":200,"msg":"user logged in"}
{"timestamp":"2026-03-30T10:00:02Z","level":"error","trace_id":"e5f6g7h8","status":500,"msg":"database connection timeout"}
{"timestamp":"2026-03-30T10:00:03Z","level":"info","trace_id":"i9j0k1l2","status":200,"msg":"item added to cart"}
EOF

# Step 2: Extract error logs and format as human-readable key-value output
cat /tmp/app.log | jq -r 'select(.level=="error") | "TraceID: \(.trace_id) -> Message: \(.msg)"'

# Step 3: Extract unique trace IDs from error events for Jaeger search
cat /tmp/app.log | jq -r 'select(.status >= 500) | .trace_id' > /tmp/error_traces.txt
cat /tmp/error_traces.txt
```

## Common Mistakes
- **Logging Sensitive Data (PII/Credentials)**: Writing plain-text passwords, tokens, or credit card numbers to logs. *Fix*: Implement automated sanitization transforms (regex masking) at the log collector agent layer before storage.
- **Unbounded Metric Labels (High Cardinality)**: Adding user IDs, email addresses, or precise timestamps as metric labels. *Fix*: Keep labels discrete and low-cardinality (e.g., `environment`, `region`, `status_code`). Move unique attributes to log contexts or trace attributes.
- **Missing Distributed Trace Headers**: Failing to inject/extract headers (`traceparent`) across microservice HTTP/gRPC client calls. *Fix*: Use auto-instrumentation libraries provided by OpenTelemetry.

---

# Prometheus Metrics and PromQL

## Overview
Prometheus is an open-source metric aggregation and time-series database engine designed for dynamic cloud environments. It operates primarily on a pull-based model, regularly scraping HTTP metrics endpoints exposed by applications and system exporters. PromQL (Prometheus Query Language) enables SREs to perform real-time mathematical operations, aggregation, filtering, and rate calculations across millions of active time series.

## Why Learn Prometheus Metrics and PromQL?
- **De-Facto Cloud-Native Standard**: Native integration with Kubernetes, Service Meshes (Istio, Linkerd), and modern infrastructure tools.
- **High Interview Frequency**: PromQL syntax and Prometheus storage architecture are standard assessment topics in SRE hiring pipelines.
- **Efficient Time-Series Engine**: Uses optimized chunk encoding (Gorilla compression) to store millions of data points with low resource utilization.
- **Alert Engine Integration**: Serves as the primary telemetry source for generating precise alerts via Alertmanager.

## Architecture / How It Works
Prometheus actively scrapes metric targets based on service discovery mechanisms, saves points to local TSDB storage, and exposes an engine interface for PromQL queries.

```
+------------------+     Pull     +-------------------+
| Target App /     |<-------------| Prometheus Server |
| Exporter         |  /metrics    | - Retrieval Engine|
+------------------+              | - TSDB Storage    |
                                  | - PromQL Engine   |
                                  +---------+---------+
                                            | Alerts
                                            v
                                   +------------------+
                                   |  Alertmanager    |
                                   +------------------+
```

1. **Retrieval**: PromQL engine queries service discovery (e.g., Kubernetes API) to find targets and pulls plain-text metrics via `/metrics` endpoint calls.
2. **TSDB Storage**: Samples are appended to memory buffers (head block) and periodically persisted to 2-hour data blocks on disk.
3. **Evaluation**: Rule engine runs PromQL alert and recording expressions on scheduled intervals, pushing active alert states to Alertmanager.

## Core Concepts

### Metric Types
- **Counter**: Monotonically increasing cumulative value that resets to zero on process restart (e.g., `http_requests_total`).
- **Gauge**: Single numerical value that fluctuates up and down arbitrary limits (e.g., `node_memory_active_bytes`).
- **Histogram**: Samples observations into configurable cumulative buckets while tracking sum and count (e.g., `http_request_duration_seconds_bucket`).
- **Summary**: Calculates configurable quantiles over a sliding time window directly on the client side (e.g., `rpc_duration_seconds`).

### Core Functions & PromQL Mechanics
- `rate()`: Calculates the per-second average rate of increase of a counter over a time window. Handles counter resets automatically.
- `irate()`: Calculates the instant rate of increase using the last two data points in the time window. Useful for volatile, fast-changing counters.
- `histogram_quantile()`: Derives quantiles (e.g., 99th percentile latency) from histogram bucket counters.

| Function | Targeted Metric Type | Behavior on Resets | Best Use Case |
| :--- | :--- | :--- | :--- |
| `rate(v[range])` | Counter | Smooths resets over range | Slow-moving trend analysis, SLO tracking |
| `irate(v[range])` | Counter | Smooths resets over range | High-resolution spike detection |
| `sum by (labels)` | Any Vector | N/A | Aggregating metrics across service pods/nodes |

## File System / Directory Structure
Standard Prometheus server installation layout:

```
/etc/prometheus/
├── prometheus.yml          # Core operational and scrape configuration
├── rules/                  # Alerting and recording PromQL rule definitions
│   ├── alerts.yml
│   └── recording.yml
└── data/                   # TSDB storage engine data directory
    ├── 01J8A9B1C2.../      # Immutable 2-hour block directories
    ├── wal/                # Write-Ahead Log for crash resilience
    └── lock                # Database lock file
```

| Path | Purpose |
| :--- | :--- |
| `/etc/prometheus/prometheus.yml` | Scrape target definitions, interval settings, alertmanager links |
| `/etc/prometheus/rules/` | Directory for custom PromQL alerting and recording rules |
| `/var/lib/prometheus/data/wal/` | Write-Ahead Log storing uncommitted time-series samples |

## Permissions / Configuration
Configuration file `/etc/prometheus/prometheus.yml` showing global settings, scrape jobs, and rule imports:

```yaml
global:
  scrape_interval: 15s      # Frequency for scraping metric endpoints
  evaluation_interval: 15s  # Frequency for evaluating PromQL alert rules

rule_files:
  - "rules/*.yml"           # Import path for alerting rules

scrape_configs:
  - job_name: "node_exporter"
    static_configs:
      - targets: ["localhost:9100"]  # Node exporter metrics host

  - job_name: "api_service"
    metrics_path: "/metrics"
    scheme: "http"
    kubernetes_sd_configs:         # Dynamic discovery via Kubernetes APIs
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: api-server
```

## Most Used Commands / PromQL

### Basic Queries & Aggregations
```promql
# Measure per-second HTTP request rate over a 5-minute window
rate(http_requests_total[5m])

# Aggregate total request rate across all instances grouped by status code
sum by (status) (rate(http_requests_total[5m]))

# Measure average memory usage percentage across nodes
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100
```

### Advanced PromQL & Latency Percentiles
```promql
# Compute 99th percentile latency across all API endpoints using histogram metrics
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# Detect targets that have gone offline in the last 5 minutes
up == 0

# Calculate error rate ratio (5xx responses relative to total requests)
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

## Mini Example
Run Prometheus locally using Docker, scrape metrics, and test PromQL queries.

```bash
# Step 1: Create local Prometheus configuration file
mkdir -p /tmp/prom-demo
cat << 'EOF' > /tmp/prom-demo/prometheus.yml
global:
  scrape_interval: 5s
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

# Step 2: Launch Prometheus container detached on port 9090
docker run -d --name prom-test -p 9090:9090 -v /tmp/prom-demo/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus:latest   # Run instance

# Step 3: Wait 15 seconds, then execute PromQL query via curl API interface
sleep 15
curl -s "http://localhost:9090/api/v1/query?query=rate(prometheus_http_requests_total[1m])" | jq .   # Query current request rates

# Step 4: Clean up container resources
docker stop prom-test && docker rm prom-test
```

## Common Mistakes
- **Applying `rate()` to Gauges**: Calling `rate()` on fluctuating metrics like memory usage or thread count produces incorrect values. *Fix*: Use `rate()` and `irate()` strictly on Counters.
- **Cardinality Explosion**: Incorporating variables with high dynamic range (IP addresses, GUIDs, full URLs) into metric labels. *Fix*: Clean label values using regex substitution before ingestion.
- **Incorrect Quantile Aggregations**: Summing latency quantiles directly (e.g., `avg(p99)`). *Fix*: Always aggregate raw bucket counters (`_bucket`) using `sum by (le)` *before* applying `histogram_quantile()`.

---

# Grafana Dashboard Design

## Overview
Grafana is an open-source visualization, analytics, and metrics-dashboarding platform. It translates time-series metrics, structured logs, and distributed traces from various storage engines into consolidated operational displays. In SRE workflows, Grafana acts as the visual control center for live monitoring, alerting, incident triage, and executive reporting.

## Why Learn Grafana Dashboard Design?
- **Unified Observability Portal**: Connects to dozens of data backends (Prometheus, Loki, Jaeger, Elasticsearch, CloudWatch) in a single dashboard layout.
- **Operational Efficiency**: Well-structured dashboards streamline incident response and lower overall Mean Time to Detect (MTTD).
- **Core Industry Competency**: Universal standard across tech companies for visual infrastructure and application monitoring.
- **Dashboard-as-Code Support**: Complete dashboard states can be defined using JSON/Jsonnet and provisioned via GitOps pipelines.

## Architecture / How It Works
Grafana runs as a backend web server that processes user UI requests, queries connected data sources directly, and renders visualization components.

```
+-----------------------+
|    Browser UI         |
+-----------+-----------+
            | Dashboard JSON / Queries
            v
+-----------------------+
|    Grafana Server     | <---> Backend DB (SQLite/MySQL)
+-----------+-----------+
            | PromQL / LogQL / Trace Queries
            v
+-------------------------------------------------+
| Data Sources (Prometheus, Loki, Jaeger, Tempo)  |
+-------------------------------------------------+
```

1. **Dashboard Execution**: Opening a dashboard triggers query execution for all visible panels based on variable parameters.
2. **Data Fetching**: Grafana proxies query requests directly to data source endpoints (e.g., Prometheus HTTP API).
3. **Data Transformation & Rendering**: Raw time-series responses are transformed, formatted, and rendered directly in the user browser using WebGL/Canvas graphics.

## Core Concepts

### Mental Frameworks for Dashboards
- **RED Method (Services)**:
  - **R**ate: The number of requests per second processed by the service.
  - **E**rrors: The rate of failed requests per second.
  - **D**uration: The amount of time requests take to complete (Latency).
- **USE Method (Hardware / Infrastructure)**:
  - **U**tilization: The average time the resource was busy performing work (e.g., CPU utilization %).
  - **S**aturation: The degree to which extra work is queued waiting for execution (e.g., Load Average, Disk Queue depth).
  - **E**rrors: The count of error events generated by the hardware component.

### Dashboard Structural Components
- **Variables / Templating**: Dynamic dropdowns that alter query target scope (e.g., `$environment`, `$pod`, `$cluster`).
- **Transformations**: Client-side data manipulations, such as joining series, filtering field columns, or renaming labels.
- **Annotations**: Overlaid event markers (e.g., deployments, config updates, outages) displayed directly on time-series graphs.

| Panel Element | Purpose | Operational Best Practice |
| :--- | :--- | :--- |
| **Time Series Graph** | Trending metrics over time | Maximize 4-6 lines per graph to avoid visual clutter |
| **Stat / Single Value** | Immediate view of single state | Apply threshold colors (Green/Yellow/Red) based on SLO limits |
| **Heatmap** | Multi-bucket distribution | Latency distributions to spot long-tail outliers |

## File System / Directory Structure
Standard Grafana installation layout on Linux systems:

```
/etc/grafana/
├── grafana.ini                   # Primary configuration file
├── provisioning/                 # Automated GitOps configuration files
│   ├── datasources/              # Auto-provisioned data sources
│   │   └── prometheus.yaml
│   └── dashboards/               # Auto-provisioned dashboards
│       └── production.yaml
/var/lib/grafana/                 # Operational data folder
└── grafana.db                    # Default SQLite internal database (users, preferences)
```

| Path | Purpose |
| :--- | :--- |
| `/etc/grafana/grafana.ini` | Core server configuration (auth, security, ports, SMTP settings) |
| `/etc/grafana/provisioning/` | Declarative definitions for automated provisioning on container boot |
| `/var/lib/grafana/dashboards/` | JSON dashboard files loaded via filesystem provisioning |

## Permissions / Configuration
Datasource provisioning file at `/etc/grafana/provisioning/datasources/prometheus.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus-Production
    type: prometheus
    access: proxy                 # Grafana backend proxies queries to bypass CORS issues
    url: http://prometheus:9090
    isDefault: true
    editable: false               # Prevents manual UI modifications
    jsonData:
      timeInterval: "15s"
      httpMethod: "POST"          # Uses POST requests to avoid URI length limits
```

Permissions setup:
- Grafana requires read permissions for local storage and provision files:
  `chown -R grafana:grafana /var/lib/grafana /etc/grafana/provisioning`

## Most Used Commands

### Grafana CLI Management
```bash
# List installed Grafana plugins
grafana-cli plugins ls   # Displays enabled local extensions

# Install a community panel plugin
grafana-cli plugins install grafana-piechart-panel   # Download and install plugin

# Reset administrator password via command line
grafana-cli admin reset-admin-password "NewSecurePassword123!"   # Admin credential recovery
```

### Dashboard Management via HTTP API
```bash
# Export existing dashboard JSON via API using service key
curl -s -H "Authorization: Bearer <API_TOKEN>" \
  http://localhost:3000/api/dashboards/uid/api-overview | jq . > api-overview.json   # Backup dashboard JSON

# Provision a dashboard JSON file into Grafana instance via API
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -d @dashboard_payload.json \
  http://localhost:3000/api/dashboards/db   # Push local dashboard file to Grafana
```

## Mini Example
Provision a dynamic variable in Grafana panel payload JSON to filter metrics by instance.

```bash
# Step 1: Create a basic JSON variable definition file for dynamic target selection
cat << 'EOF' > /tmp/grafana_var.json
{
  "name": "node",
  "type": "query",
  "datasource": "Prometheus-Production",
  "query": "label_values(node_cpu_seconds_total, instance)",
  "refresh": 1,
  "sort": 1
}
EOF

# Step 2: Validate the JSON payload format
jq . /tmp/grafana_var.json

# Step 3: Embed variable syntax within PromQL query string inside panel JSON
# Example transformation usage inside panel configuration payload:
# Query string: "rate(node_cpu_seconds_total{instance=~\"$node\", mode=\"idle\"}[5m])"
```

## Common Mistakes
- **Visual Overload ("Rainbow Dashboards")**: Placing dozens of overlapping lines on a single graph panel. *Fix*: Use `sum by ()` aggregation or break out metrics into distinct panels.
- **Ignoring Dashboard Load Performance**: Running expensive PromQL queries over wide time ranges across large panels. *Fix*: Create Prometheus **Recording Rules** to pre-compute long-term aggregated time series.
- **Hardcoding Dynamic Parameters**: Explicitly typing service names or IP addresses directly into panel queries. *Fix*: Use template **Variables** (`$environment`, `$pod`) to make dashboards reusable.

---

# Distributed Tracing with Jaeger

## Overview
Jaeger is an open-source distributed tracing system created by Uber and managed by the Cloud Native Computing Foundation (CNCF). In microservice architectures, a single incoming request often triggers multiple downstream HTTP or gRPC calls across distinct services. Jaeger captures and visualizes these request paths as traces, allowing engineers to pinpoint performance bottlenecks, network latencies, and cross-service failure modes.

## Why Learn Distributed Tracing with Jaeger?
- **Microservice Diagnostics**: Provides context for root-cause analysis across dynamic distributed architectures.
- **Latency Attribution**: Pinpoints the exact microservice and operation responsible for long-tail request delays.
- **OpenTelemetry Native**: Fully compatible with the OpenTelemetry (OTel) industry standard for trace data collection.
- **Dependency Graph Analysis**: Automatically extracts real-time runtime topologies based on trace flows.

## Architecture / How It Works
Jaeger components collect, process, index, and render trace spans generated by application instrumentation agents.

```
+--------------------+     Context     +--------------------+
| Service A (Client) | --------------> | Service B (Server) |
| OpenTelemetry SDK  |  W3C Traceparent| OpenTelemetry SDK  |
+---------+----------+                 +---------+----------+
          |                                      |
          | Spans (gRPC/UDP)                     | Spans
          v                                      v
+-----------------------------------------------------------+
|                    Jaeger Collector                       |
+-----------------------------+-----------------------------+
                              |
                              v
                 +-------------------------+
                 | Storage (Elasticsearch) |
                 +-------------------------+
```

1. **Instrumentation & Context Propagation**: Application code uses OpenTelemetry SDKs to create spans and inject standard W3C `traceparent` headers into outgoing network requests.
2. **Collection**: In-process SDKs batch spans and transmit them via gRPC/OTLP to the Jaeger Collector daemon.
3. **Storage & Visualization**: Jaeger Collector validates, indexes, and writes trace spans into persistent storage engines (e.g., Elasticsearch, Cassandra) for consumption via the Jaeger UI.

## Core Concepts

### Span Mechanics & Propagation Context
- **Trace**: A Directed Acyclic Graph (DAG) of spans representing an execution flow end-to-end. Identified by a unique 128-bit **Trace ID**.
- **Span**: A named, timed logical unit of work containing:
  - Operation name.
  - Start timestamp and duration.
  - Key-value **Tags** (e.g., `http.status_code = 500`).
  - **Logs/Events** (timestamped structured messages inside the span).
  - Context references to parent spans.
- **Context Propagation**: Passing trace identifiers across process boundaries using standardized HTTP headers (`traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`).

### Sampling Strategies
- **Head Sampling**: The Decision to sample a trace is made when the root span starts. Reduces bandwidth and storage usage, but may drop rare error traces.
- **Tail Sampling**: Collector analyzes full traces in memory before deciding whether to store them. Preserves non-deterministic errors and high-latency traces, but requires high memory capacity.

| Concept | Description | Real-World Example |
| :--- | :--- | :--- |
| **Trace ID** | Global identifier shared across all services handling a request | `4bf92f3577b34da6a3ce929d0e0e4736` |
| **Span ID** | Unique identifier for a specific unit of work | `00f067aa0ba902b7` |
| **Baggage** | Key-value pairs propagated across the trace DAG to downstream services | `user_tier = premium` |

## File System / Directory Structure
Standard Jaeger production collector configuration tree:

```
/etc/jaeger/
├── jaeger-collector.yaml      # Collector intake pipeline and storage setup
└── jaeger-query.yaml          # UI and query interface configuration
```

| Path | Purpose |
| :--- | :--- |
| `/etc/jaeger/jaeger-collector.yaml` | Controls collector endpoints, OTLP intake ports, and storage credentials |
| `/etc/jaeger/jaeger-query.yaml` | Configures UI authentication, query limits, and backend search indexes |

## Permissions / Configuration
Jaeger Collector intake configuration file `/etc/jaeger/jaeger-collector.yaml`:

```yaml
collector:
  otlp:
    grpc:
      endpoint: "0.0.0.0:4317"    # OTLP gRPC intake receiver port
    http:
      endpoint: "0.0.0.0:4318"    # OTLP HTTP intake receiver port

storage:
  type: elasticsearch
  elasticsearch:
    servers:
      - "http://elasticsearch.internal:9200"
    index-prefix: "jaeger-prod"
    max-num-spans: 10000

sampling:
  strategies-file: /etc/jaeger/sampling_strategies.json  # Sampling rules config path
```

Sampling config `/etc/jaeger/sampling_strategies.json`:
```json
{
  "default_strategy": {
    "type": "probabilistic",
    "param": 0.1  // Samples 10% of total incoming traces by default
  }
}
```

## Most Used Commands

### Container Operations
```bash
# Launch local Jaeger All-in-One developer instance with UI and OTLP ports
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest   # Starts localized Jaeger stack

# Verify Jaeger collector healthy status via HTTP check
curl -i http://localhost:14269/   # Health check port
```

### Jaeger Query API Interacting
```bash
# Fetch recent traces for a specific service using the REST API
curl -s "http://localhost:16686/api/traces?service=cart-service&limit=10" | jq .   # Extract trace payload

# Fetch detailed metadata for a specific Trace ID
curl -s "http://localhost:16686/api/traces/4bf92f3577b34da6a3ce929d0e0e4736" | jq .
```

## Mini Example
Instrument a Python application using OpenTelemetry SDK to send traces to Jaeger.

```bash
# Step 1: Install required OpenTelemetry dependencies
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http

# Step 2: Create instrumented application script
cat << 'EOF' > /tmp/trace_demo.py
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Set up exporter pointing to Jaeger OTLP HTTP port
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4318/v1/traces"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("demo-tracer")

# Start parent span
with tracer.start_as_current_span("parent-operation") as parent:
    parent.set_attribute("custom.environment", "demo")
    print("Executing parent operations...")
    time.sleep(0.1)
    
    # Start child span
    with tracer.start_as_current_span("child-db-query") as child:
        child.set_attribute("db.statement", "SELECT * FROM users")
        time.sleep(0.2)
        print("Child query completed.")

print("Trace span sequence sent successfully.")
EOF

# Step 3: Run the script to emit sample trace spans
python3 /tmp/trace_demo.py
```

## Common Mistakes
- **Broken Context Propagation**: Creating new root spans inside downstream microservices instead of extracting incoming context headers. *Fix*: Pass the `traceparent` context header explicitly across HTTP/gRPC boundaries using OpenTelemetry propagators.
- **Sampling 100% of Production Traffic**: Storing every trace in high-throughput systems creates severe network bottlenecks and storage expenses. *Fix*: Configure **Probabilistic** (e.g., 1% sample rate) or **Tail-based** sampling.
- **Unbounded Span Attributes**: Storing massive binary blobs, base64 data, or entire JSON payloads inside span attributes. *Fix*: Keep attributes reserved for low-footprint keys, IDs, and operational status metadata.

---

# Alerting Strategy and Runbooks

## Overview
An alerting strategy dictates when, how, and to whom system notifications are dispatched during operational anomalies. Alerts translate raw telemetry signals into human interventions. To prevent alert fatigue, modern SRE operational models mandate that alerts must be actionable, symptom-oriented, and tied directly to detailed operational **Runbooks**.

## Why Learn Alerting Strategy and Runbooks?
- **Alert Fatigue Prevention**: Reduces burnout and operational strain by filtering out non-actionable noise.
- **Faster Incident Remediation**: Actionable runbooks lower Mean Time to Resolution (MTTR) by standardizing step-by-step recovery procedures.
- **Production Safety Standard**: Critical requirement for high-availability production environments.
- **Operational Consistency**: Ensures on-call engineers follow documented procedures during incident triage.

## Architecture / How It Works
Alerting frameworks process metric expressions, evaluate triggers, group related alerts, and route notifications to handling systems.

```
+--------------------+
| Prometheus / Alert |
| Rule Evaluation    |
+---------+----------+
          | Alerts fired
          v
+--------------------+      Routing      +--------------------+
| Alertmanager       | ----------------> | PagerDuty / OpsGenie|
| (Dedupe, Inhibit,  |                   | / Slack            |
| Silence, Group)    |                   +---------+----------+
+--------------------+                             |
                                                   v
                                         +--------------------+
                                         | On-Call SRE        |
                                         | + Runbook Link     |
                                         +--------------------+
```

1. **Rule Evaluation**: Prometheus regularly runs PromQL alert expressions. If a condition holds true longer than the specified `for` duration, the alert transitions to the `firing` state.
2. **Alertmanager Processing**: Fired alerts are sent to Prometheus Alertmanager to undergo **Deduplication**, **Grouping**, **Inhibition** (suppressing secondary alerts), and **Silencing**.
3. **Dispatch & Action**: Alertmanager routes structured payloads to escalation platforms (PagerDuty, Slack). On-call engineers click the embedded runbook URL to begin remediation.

## Core Concepts

### Alert Classification: Cause vs. Symptom
- **Cause-Based Alerting**: Triggers on specific internal underlying factors (e.g., `CPU > 90%`, `Disk Space < 10%`). These can produce high noise levels because high resource utilization doesn't always imply user impact.
- **Symptom-Based Alerting**: Triggers on direct user impact (e.g., `HTTP Error Rate > 2%`, `p99 Latency > 2s`). This is the preferred pattern for high-priority pager alerts.

### Runbook Structure
Every production alert must include a link to an accessible, up-to-date runbook containing:
1. **Summary & Impact**: Concise statement describing user impact and component scope.
2. **Verification**: Commands or metrics to confirm if the incident is ongoing or a false positive.
3. **Immediate Mitigation**: Step-by-step steps to restore service availability (e.g., fallback, rollback, capacity scale-out).
4. **Escalation Path**: Primary and secondary contact channels if standard mitigations fail.

| Alertmanager Mechanism | Purpose | Operational Scenario |
| :--- | :--- | :--- |
| **Grouping** | Aggregates related alerts into a single notification bundle | Combining 50 failing container alerts into 1 cluster notification |
| **Inhibition** | Suppresses downstream alerts if a core root cause alert is already active | Silencing application latency alerts when the network switch is down |
| **Silencing** | Temporarily mutes alerts for specific matchers | Suppressing alerts during a scheduled database maintenance window |

## File System / Directory Structure
Standard alert processing files layout:

```
/etc/prometheus/
├── alertmanager.yml         # Alertmanager routing, grouping, and receiver configuration
└── rules/
    └── base_alerts.yml      # Prometheus alert rule definitions with runbook URLs
```

| Path | Purpose |
| :--- | :--- |
| `/etc/prometheus/alertmanager.yml` | Routing rules, integration parameters, silences, and notification templates |
| `/etc/prometheus/rules/base_alerts.yml` | Declarative PromQL threshold definitions and runbook annotation links |

## Permissions / Configuration

### Prometheus Alert Rule Definition (`/etc/prometheus/rules/base_alerts.yml`)
```yaml
groups:
  - name: api_availability_alerts
    rules:
      - alert: HighApiErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 2m  # Alert must remain true continuously for 2 minutes before firing
        labels:
          severity: critical
          tier: backend
        annotations:
          summary: "API Service HTTP 5xx error rate exceeded 5%"
          description: "Current error rate is {{ $value }}%. High customer impact detected."
          runbook_url: "https://wiki.internal/runbooks/high-api-error-rate"
```

### Alertmanager Routing Configuration (`/etc/prometheus/alertmanager.yml`)
```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s         # Initial delay before sending first notification bundle
  group_interval: 5m      # Delay before sending updates for existing alert group
  repeat_interval: 12h    # Resend interval for active alerts
  receiver: 'slack-default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-high-priority'

receivers:
  - name: 'slack-default'
    slack_configs:
      - channel: '#alerts-dev'
        api_url: 'https://hooks.slack.com/services/T00/B00/X00'
  - name: 'pagerduty-high-priority'
    pagerduty_configs:
      - service_key: 'pd-integration-secret-key'
```

## Most Used Commands

### PromQL Alert Validation
```bash
# Validate alert rule file syntax and structure using promtool
promtool check rules /etc/prometheus/rules/base_alerts.yml   # Structural linting check

# Run unit tests on Prometheus alerting rule logic
promtool test rules /etc/prometheus/tests/rule_tests.yml     # Execute evaluation test suite
```

### Alertmanager CLI (`amtool`) Operations
```bash
# View all active alerts currently managed by Alertmanager
amtool --alertmanager.url=http://localhost:9393 alert   # Query active states

# Create a temporary silence for maintenance window
amtool --alertmanager.url=http://localhost:9393 silence add \
  alertname=HighApiErrorRate \
  --duration=2h \
  --author="SRE-OnCall" \
  --comment="Scheduled API database maintenance window"   # Mutes alert matching criteria for 2 hours

# Query active silences
amtool --alertmanager.url=http://localhost:9393 silence query   # Returns current silences
```

## Mini Example
Define a rule, test its expression syntax, and create an automated silence via `amtool`.

```bash
# Step 1: Write an alerting rule file
cat << 'EOF' > /tmp/test_alert.yml
groups:
  - name: disk_alerts
    rules:
      - alert: DiskSpaceLow
        expr: node_filesystem_free_bytes / node_filesystem_size_bytes * 100 < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          runbook_url: "https://runbooks.local/disk-full"
EOF

# Step 2: Validate the file syntax
promtool check rules /tmp/test_alert.yml

# Step 3: Create a 30-minute silence matching the rule using amtool CLI
amtool silence add alertname=DiskSpaceLow --duration=30m --comment="Testing alert silence workflow" --alertmanager.url=http://localhost:9093
```

## Common Mistakes
- **Alerting Without Runbooks**: Sending high-priority page alerts that lack actionable context or mitigation links. *Fix*: Require every `critical` alert definition to contain a valid, maintained `runbook_url` annotation.
- **Flapping Alerts**: Alerts that rapidly alternate between firing and resolved states due to strict thresholds and missing `for` durations. *Fix*: Set realistic `for` evaluation times (e.g., `for: 5m`) and introduce hysteresis bounds.
- **Alert Fatigue from Non-Actionable Alerts**: Paging on-call engineers for non-critical issues (e.g., single pod restart, high CPU utilization without user impact). *Fix*: Transition cause-based alerts to symptom-based metrics, routing minor issues to non-urgent Slack channels instead of pagers.

---

# SLO / SLA / Error Budget Concepts

## Overview
Service Level Indicators (SLIs), Service Level Objectives (SLOs), and Service Level Agreements (SLAs) form the core operational framework of Site Reliability Engineering. **SLIs** measure real-time compliance metrics, **SLOs** set internal reliability goals, and **SLAs** specify contractual commitments to users. The mathematical difference between 100% availability and your SLO represents your **Error Budget**—a controlled margin used to balance deployment velocity against system stability.

## Why Learn SLO / SLA / Error Budget Concepts?
- **Core SRE Methodology**: Direct implementation of modern Site Reliability Engineering standards popularized by Google.
- **Data-Driven Release Governance**: Error budgets provide objective criteria for deciding when to approve new deployments versus freezing releases to focus on stability.
- **Alignment Across Teams**: Establishes a shared language for reliability between Product, Engineering, and Business stakeholders.
- **High Interview Frequency**: SLO/SLI derivations and burn rate calculations are heavily tested in SRE leadership and technical interviews.

## Architecture / How It Works
Raw telemetry data is converted into SLIs, measured against target SLO limits, and consumed to track Error Budget burn rates.

```
+-----------------------------------------------------------------+
|                     100% Total Requests                          |
+-----------------------------------+-----------------------------+
|  SLO Goal (e.g., 99.9% Successful)| Error Budget (0.1% Allowed) |
+-----------------------------------+-----------------------------+
                                    | Spent on:                   |
                                    | - Bad deployments           |
                                    | - Outages / Latency spikes  |
                                    | - Maintenance               |
                                    +-----------------------------+
```

1. **Telemetry Ingestion**: Systems capture performance data (e.g., total requests vs. successful requests).
2. **SLI Calculation**: Calculated dynamically as a percentage: $\text{SLI} = \left( \frac{\text{Good Events}}{\text{Total Events}} \right) \times 100$.
3. **Error Budget Consumption**: Downtime or elevated error rates deplete the error budget over a rolling compliance window (e.g., 30 days). If the budget is exhausted ($0\%$), new deployments are paused to focus on stability.

## Core Concepts

### Defining the Framework Components
- **SLI (Service Level Indicator)**: A quantifiable metric tracking service performance (e.g., Ratio of HTTP calls completed in under 200ms).
- **SLO (Service Level Objective)**: The target reliability goal set for an SLI over a defined time window (e.g., $99.9\%$ success rate over a rolling 30-day period).
- **SLA (Service Level Agreement)**: A formal contract with end users defining the service standard, including financial remedies or service credits if breached. SLAs are set lower than internal SLO targets to provide a safety buffer.
- **Error Budget**: The maximum acceptable unreliability for a service over a given window. $\text{Error Budget} = 100\% - \text{SLO}$.

### Burn Rate Mechanics
Burn rate measures how fast a system consumes its error budget.
- A burn rate of **1.0** means the error budget will be fully consumed over the compliance window (e.g., 30 days).
- A burn rate of **14.4** consumes $2\%$ of the error budget in 1 hour—requiring high-priority alerts to mitigate rapid budget depletion.

| Term | Target Value Example | Primary Audience | Managed By |
| :--- | :--- | :--- | :--- |
| **SLI** | Current: `99.94%` | SREs / Platform Engineers | Automated Query Engines |
| **SLO** | Target: `99.9%` (30-day window) | Product Managers & Engineering | SRE + Software Engineering |
| **SLA** | Legal: `99.0%` (Monthly) | End Customers & Executives | Legal / Enterprise Business |

## File System / Directory Structure
Declarative SLO generator tool configuration (e.g., Sloth / Pyrra) layout:

```
/etc/sloth/
├── sloth.yaml             # Core CLI binary configuration
└── globs/                 # Service SLO specification definitions
    ├── cart_service.yaml
    └── auth_service.yaml
```

| Path | Purpose |
| :--- | :--- |
| `/etc/sloth/globs/` | Stores high-level declarative YAML definitions converted into PromQL SLO rules |

## Permissions / Configuration
Sloth declarative SLO definition file at `/etc/sloth/globs/cart_service.yaml`:

```yaml
version: "prometheus/v1"
service: "cart-service"
labels:
  owner: "checkout-team"
  tier: "critical"

slos:
  - name: "http-availability"
    objective: 99.9              # Target SLO: 99.9% availability
    description: "Successful HTTP status responses calculated over a 30-day rolling window"
    sli:
      events:
        error_query: sum(rate(http_requests_total{service="cart-service", status=~"5.."}[{{.window}}]))
        total_query: sum(rate(http_requests_total{service="cart-service"}[{{.window}}]))
    alerting:
      name: "CartServiceAvailabilityAlert"
      labels:
        category: "slo-burn-rate"
      annotations:
        runbook_url: "https://wiki.internal/runbooks/slo-burn-cart"
```

## Most Used Commands

### PromQL Calculations for SLIs and Error Budgets
```promql
# Calculate availability SLI over a rolling 30-day window
sum(rate(http_requests_total{status!~"5.."}[30d])) 
/ 
sum(rate(http_requests_total[30d])) * 100

# Calculate remaining Error Budget percentage for a 99.9% SLO
100 - (
  (1 - (sum(rate(http_requests_total{status!~"5.."}[30d])) / sum(rate(http_requests_total[30d]))))
  / (1 - 0.999) * 100
)

# Calculate 1-hour fast burn rate query for alert triggering
(
  sum(rate(http_requests_total{status=~"5.."}[1h])) 
  / 
  sum(rate(http_requests_total[1h]))
) / (1 - 0.999)
```

### Generating Prometheus Rules with Sloth CLI
```bash
# Generate Prometheus PromQL rule manifests directly from Sloth specification file
sloth generate -i /etc/sloth/globs/cart_service.yaml -o /etc/prometheus/rules/cart_slo_rules.yml   # Build PromQL rules

# Validate generated Prometheus rule output syntax
promtool check rules /etc/prometheus/rules/cart_slo_rules.yml
```

## Mini Example
Calculate current SLI compliance and error budget consumption for a microservice using Python.

```bash
# Step 1: Create an SLI/Error Budget calculator script
cat << 'EOF' > /tmp/slo_calc.py
def calculate_slo_metrics(total_requests, failed_requests, slo_target_percent):
    good_requests = total_requests - failed_requests
    sli = (good_requests / total_requests) * 100
    
    allowed_unreliability_ratio = (100.0 - slo_target_percent) / 100.0
    actual_unreliability_ratio = (failed_requests / total_requests)
    
    total_budget_events = total_requests * allowed_unreliability_ratio
    spent_budget_events = failed_requests
    remaining_budget_percent = ((total_budget_events - spent_budget_events) / total_budget_events) * 100.0
    
    print(f"Total Requests: {total_requests}")
    print(f"SLI Achieved:   {sli:.3f}%")
    print(f"Target SLO:     {slo_target_percent}%")
    print(f"Error Budget Remaining: {remaining_budget_percent:.2f}%")

if __name__ == "__main__":
    # Example scenario: 1,000,000 requests, 1,200 errors, 99.9% SLO target
    calculate_slo_metrics(1000000, 1200, 99.9)
EOF

# Step 2: Run the calculator script
python3 /tmp/slo_calc.py
```

## Common Mistakes
- **Setting 100% SLO Targets**: Targetting 100% availability is practically impossible and prohibitively expensive. *Fix*: Align target SLOs with true business requirements and user expectations (e.g., 99.9%).
- **Confusing SLAs with SLOs**: Exposing aggressive internal operational SLOs as legally binding customer SLAs. *Fix*: Keep internal SLO targets strictly higher than external SLA contracts to maintain a safety buffer.
- **Ignoring Burn Rates in Alerting**: Triggering alerts only after the error budget reaches 0%. *Fix*: Alert on **Burn Rates** (e.g., burning 2% of budget in 1 hour) to catch outages early and preserve the remaining budget.

---

## Interview Questions

1. **What are the primary tradeoffs between structured logging and pull-based metric collection in high-throughput environments?**
   *Answer*: Structured logs provide rich context (IDs, stack traces) for deep debugging, but scale linearly in volume, driving up network and storage costs. Pull-based metrics aggregate numeric data over time, offering predictable storage footprints and fast querying, but lack granular per-request context.

2. **Explain the functional differences between Prometheus Counters, Gauges, Histograms, and Summaries.**
   *Answer*: Counters are monotonically increasing values for cumulative totals (resets to 0 on restart). Gauges capture single scalar values that move up and down. Histograms track observation counts into configurable cumulative buckets on the server side (allowing aggregation across instances via `histogram_quantile`). Summaries calculate client-side quantiles over sliding time windows (lightweight on server, but non-aggregatable across instances).

3. **How does PromQL handle counter resets when executing the `rate()` function?**
   *Answer*: The `rate()` function scans time-series data points within the defined window. If a drop in value is detected, it assumes the process restarted, compensates by adding the value prior to the drop to subsequent measurements, and computes the per-second rate of increase across the range.

4. **What is the difference between Head Sampling and Tail Sampling in distributed tracing?**
   *Answer*: Head sampling makes a probabilistic sampling decision at the start of a request (at the root span), reducing network overhead but potentially dropping rare errors. Tail sampling buffers all trace spans in memory until the request completes, preserving high-latency or failing traces at the expense of higher memory utilization on trace collectors.

5. **Explain the USE and RED operational frameworks and identify when each should be applied.**
   *Answer*: The RED method targets request-driven software services by tracking **R**ate, **E**rrors, and **D**uration (Latency). The USE method targets physical or virtual infrastructure resources by measuring **U**tilization, **S**aturation, and **E**rrors.

6. **How does Alertmanager use Inhibition and Grouping to prevent alert fatigue?**
   *Answer*: Grouping bundles related firing alerts into a single combined notification (e.g., grouping 20 failing pod alerts under one cluster notification). Inhibition suppresses downstream alerts if a related parent alert is already active (e.g., suppressing application latency alerts if a core network router is marked down).

7. **How do you pass distributed trace contexts across asynchronous boundaries like Message Queues (Kafka/RabbitMQ)?**
   *Answer*: By manually injecting the OpenTelemetry standard `traceparent` context header into message payload metadata fields before publishing to the queue, and then extracting those headers inside the consumer service worker before creating downstream child spans.

8. **Define SLI, SLO, SLA, and Error Budget, and explain how they relate mathematically.**
   *Answer*: An SLI measures current performance ($\frac{\text{Good Events}}{\text{Total Events}} \times 100$). An SLO is the internal target for that SLI over a time window (e.g., 99.9%). An SLA is the legal customer contract (e.g., 99.0%). The Error Budget is the allowable margin of unreliability ($100\% - \text{SLO}$).

9. **Why is it incorrect to average `p99` latency quantiles directly across multiple server instances in Grafana?**
   *Answer*: Percentiles are non-additive mathematical distributions. Averaging percentile values across distinct instances gives equal weight to all nodes regardless of request volume, hiding true long-tail tail-latency outliers. Quantiles must be calculated from aggregated bucket counts using `histogram_quantile(0.99, sum by (le) (...))`.

10. **What is an Error Budget Burn Rate, and why is it useful for alerting?**
    *Answer*: Burn rate measures the rate at which an error budget is being consumed relative to your SLO window. Alerting on burn rates (e.g., burning 2% of budget in 1 hour) triggers notifications based on how quickly the budget is being exhausted, allowing SREs to resolve severe issues before the entire budget is depleted.

---

## Quick Revision

✅ **Logs** record discrete, timestamped context events, **Metrics** store numeric time series, and **Traces** trace requests across microservice boundaries.
✅ **Prometheus** uses a pull model to scrape plaintext HTTP endpoints (`/metrics`) on defined scrape intervals.
✅ **Counters** must only increase or reset to zero; never apply `rate()` functions to **Gauges**.
✅ Use **`irate()`** for fast-changing counters and immediate spike detection, and **`rate()`** for smooth trend analysis over wider time windows.
✅ Calculate histogram quantiles in PromQL by aggregating bucket counts (`sum by (le)`) *before* applying `histogram_quantile()`.
✅ Use the **RED Method** (Rate, Errors, Duration) for service monitoring, and the **USE Method** (Utilization, Saturation, Errors) for infrastructure monitoring.
✅ Declarative Grafana setups store provisioning YAML configurations in `/etc/grafana/provisioning/`.
✅ **Context Propagation** relies on passing standard W3C `traceparent` headers across HTTP, gRPC, and messaging boundaries.
✅ **Head Sampling** selects traces at request start; **Tail Sampling** buffers traces in memory to capture high-latency and error traces.
✅ **Alertmanager** manages notifications through Deduplication, Grouping, Inhibition, and Silencing.
✅ Every high-priority operational alert must include a direct, maintained **Runbook URL** in its annotations.
✅ Use **`amtool`** to create silences and inspect active alerts managed by Alertmanager.
✅ **SLI** is the real-time measurement; **SLO** is the target goal; **SLA** is the legal contract with financial consequences.
✅ **Error Budget** is calculated as $100\% - \text{SLO}$ over a set rolling window (e.g., 30 days).
✅ A **Burn Rate** of 14.4 consumes 2% of an error budget in 1 hour, serving as a key threshold for fast-burn alerts.
✅ **Symptom-based alerting** (e.g., high error rates) creates fewer false positives than cause-based alerting (e.g., high CPU utilization).
✅ Pause new feature deployments when your **Error Budget** reaches $0\%$ to focus engineering effort on system stability.
✅ **Vector** and **Fluentbit** serve as high-performance collectors for processing and routing logs.
✅ Keep metric label cardinality low to prevent high memory consumption and poor TSDB query performance.
✅ Set internal **SLOs** higher than external **SLAs** to maintain a safety buffer for operational issues.