# Vast.ai — Hunyuan3D-2.1 GPU Server

## Quick Start

### 1. Rent a GPU on Vast.ai

1. Go to [vast.ai](https://vast.ai) and create an account
2. Click **Search** → filter for:
   - GPU RAM: **≥ 24 GB** (RTX 3090, RTX 4090, A5000, A6000)
   - Template: **PyTorch** (any version with CUDA 12.x)
   - Disk: **≥ 40 GB**
3. Rent an instance (interruptible is cheapest, ~$0.15–0.25/hr)

### 2. Connect and install

SSH into your instance (Vast.ai shows the SSH command):

```bash
ssh -p <port> root@<ip> -L 8081:localhost:8081
```

> The `-L 8081:localhost:8081` flag tunnels the remote API to your local machine.

Upload and run the setup script:

```bash
# From your local machine (in the project root):
scp -P <port> vast-ai/setup.sh root@<ip>:/workspace/setup.sh

# On the Vast.ai instance:
bash /workspace/setup.sh
```

First run takes ~10–15 min (cloning, installing, downloading 5GB model weights).

### 3. Configure your local backend

In your `.env` file:

```
HUNYUAN3D_API_URL=http://localhost:8081
```

This works because the SSH tunnel forwards port 8081.

If you want to use the instance's public IP instead (no tunnel):

```
HUNYUAN3D_API_URL=http://<vast-ip>:<mapped-port>
```

### 4. Test it

```bash
# Health check
curl http://localhost:8081/health

# Should return: {"status": "healthy", "worker_id": "..."}
```

Then use the debug client at http://localhost:3001 to test a full generation.

## Restarting the server

If you need to restart (after a crash, etc.):

```bash
bash /workspace/setup.sh --start
```

## Costs

| GPU | Approx. $/hr | Time per model | Cost for 14 models |
|-----|--------------|----------------|---------------------|
| RTX 3090 | $0.20–0.30 | ~60–90s | ~$0.08–0.12 |
| RTX 4090 | $0.35–0.50 | ~40–60s | ~$0.08–0.12 |
| A5000 | $0.25–0.35 | ~60–90s | ~$0.08–0.12 |

**Remember:** Destroy your instance when done to stop billing.
