import requests

BASE = 'http://localhost:8000'

# ── 1. Create roadmap ─────────────────────────────────────────────────────────
r = requests.post(BASE + '/api/roadmaps/', json={
    'title': 'Full-Stack SRE Learning Path',
    'description': 'A structured journey from fundamentals to advanced SRE practices.',
    'period_type': 'month',
    'total_periods': 6,
})
rm = r.json()
print('Created roadmap id=' + str(rm['id']))
rm_id = rm['id']

# ── 2. Period content ─────────────────────────────────────────────────────────
periods_data = [
    {
        'label': 'Linux & Bash Fundamentals',
        'topics': (
            '- Linux file system hierarchy\n'
            '- File permissions and ownership\n'
            '- Process management (ps, top, kill)\n'
            '- Shell scripting basics\n'
            '- Cron jobs and scheduling\n'
            '- Systemd and service management'
        ),
        'tasks_done': [True, True, True, True, False, False],
        'resources': [
            {'title': 'The Linux Command Line', 'url': 'https://linuxcommand.org/tlcl.php'},
            {'title': 'Missing Semester - Shell Tools', 'url': 'https://missing.csail.mit.edu/2020/shell-tools/'},
        ]
    },
    {
        'label': 'Networking & HTTP Deep Dive',
        'topics': (
            '- TCP/IP model layers\n'
            '- DNS resolution walkthrough\n'
            '- HTTP/HTTPS and TLS handshake\n'
            '- Load balancers and proxies\n'
            '- iptables and firewall rules\n'
            '- Wireshark and packet analysis'
        ),
        'tasks_done': [True, True, True, False, False, False],
        'resources': [
            {'title': 'Cloudflare Learning Center', 'url': 'https://www.cloudflare.com/learning/'},
            {'title': 'Computer Networking: Top-Down', 'url': 'https://gaia.cs.umass.edu/kurose_ross/'},
        ]
    },
    {
        'label': 'Observability & Monitoring',
        'topics': (
            '- Logs, metrics, and traces\n'
            '- Prometheus metrics and PromQL\n'
            '- Grafana dashboard design\n'
            '- Distributed tracing with Jaeger\n'
            '- Alerting strategy and runbooks\n'
            '- SLO / SLA / Error budget concepts'
        ),
        'tasks_done': [False, False, False, False, False, False],
        'resources': [
            {'title': 'Prometheus docs', 'url': 'https://prometheus.io/docs/'},
            {'title': 'Grafana tutorials', 'url': 'https://grafana.com/tutorials/'},
        ]
    },
    {
        'label': 'Containers & Kubernetes',
        'topics': (
            '- Docker fundamentals and Dockerfile\n'
            '- Container networking\n'
            '- Kubernetes architecture\n'
            '- Pods, Deployments, Services\n'
            '- Helm charts and templating\n'
            '- RBAC and security contexts'
        ),
        'tasks_done': [False, False, False, False, False, False],
        'resources': [
            {'title': 'Kubernetes docs', 'url': 'https://kubernetes.io/docs/home/'},
            {'title': 'Play with Kubernetes', 'url': 'https://labs.play-with-k8s.com/'},
        ]
    },
    {
        'label': 'CI/CD & Infrastructure as Code',
        'topics': (
            '- Git branching strategies\n'
            '- GitHub Actions workflows\n'
            '- Terraform basics\n'
            '- Ansible playbooks\n'
            '- ArgoCD GitOps\n'
            '- Secrets management with Vault'
        ),
        'tasks_done': [False, False, False, False, False, False],
        'resources': [
            {'title': 'HashiCorp Learn', 'url': 'https://learn.hashicorp.com/'},
        ]
    },
    {
        'label': 'Incident Management & Chaos Engineering',
        'topics': (
            '- On-call best practices\n'
            '- Blameless postmortems\n'
            '- Chaos Monkey experiments\n'
            '- Runbooks and playbooks\n'
            '- SRE team structures\n'
            '- Career growth in SRE'
        ),
        'tasks_done': [False, False, False, False, False, False],
        'resources': [
            {'title': 'SRE Book (Google)', 'url': 'https://sre.google/sre-book/table-of-contents/'},
        ]
    },
]

# ── 3. Fetch created periods ───────────────────────────────────────────────────
rm_detail = requests.get(BASE + '/api/roadmaps/' + str(rm_id)).json()
periods = rm_detail['periods']
print('Got ' + str(len(periods)) + ' periods')

# ── 4. Update each period with label, topics, resources ──────────────────────
for i, (period, data) in enumerate(zip(periods, periods_data)):
    pid = period['id']
    requests.put(BASE + '/api/roadmaps/' + str(rm_id) + '/periods/' + str(pid), json={
        'label': data['label'],
        'topics': data['topics'],
    })
    for res in data['resources']:
        requests.post(
            BASE + '/api/roadmaps/' + str(rm_id) + '/periods/' + str(pid) + '/resources',
            json={'title': res['title'], 'url': res['url'], 'sort_order': i}
        )
    print('  Period ' + str(i + 1) + ' updated: ' + data['label'])

# ── 5. Start the roadmap ──────────────────────────────────────────────────────
resp = requests.post(BASE + '/api/roadmaps/' + str(rm_id) + '/start', json={})
print('Roadmap started. started_at=' + str(resp.json().get('started_at')))

# ── 6. Toggle tasks for first two months ─────────────────────────────────────
for i, (period, data) in enumerate(zip(periods[:2], periods_data[:2])):
    pid = period['id']
    for task_idx, done in enumerate(data['tasks_done']):
        if done:
            requests.post(
                BASE + '/api/roadmaps/' + str(rm_id) + '/periods/' + str(pid) + '/toggle-task',
                json={'task_index': task_idx}
            )
    print('  Tasks toggled for month ' + str(i + 1))

print('Done! Roadmap seeded successfully.')
