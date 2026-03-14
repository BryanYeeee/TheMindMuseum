# Running Hunyuan3D-2.1 on Vast.ai

This guide takes you from a fresh SSH session on a new Vast GPU instance to a running Hunyuan3D-2.1 API server that your application can call over HTTPS.

Hunyuan3D-2.1's official repo says it was tested with **Python 3.10** and **PyTorch 2.5.1+cu124**. It also states approximate VRAM requirements of **10 GB for shape generation**, **21 GB for texture generation**, and **29 GB total for shape + texture**. ([GitHub][1])

## 1. Choose a suitable Vast instance

Pick a Linux GPU instance with enough VRAM and disk.

A comfortable choice is roughly **40 to 60 GB** of disk space so you have room for:

- the repo
- the virtual environment
- pip/cache files
- model downloads
- build artifacts
- generated outputs

The repo has a fairly heavy install flow with compiled components and model assets, so very small disks can cause installs to stall or fail. ([GitHub][1])

## 2. SSH into the instance and verify the machine

Run:

```bash
nvidia-smi
df -h
cat /etc/os-release
python3 --version
which python3
```

You are checking:

- that the GPU is visible
- that disk space is large enough
- what Linux distro you are on
- what Python version is already installed

## 3. Make sure Python 3.10 is available

Hunyuan3D-2.1 is tested on **Python 3.10**, so this matters. ([GitHub][1])

If:

```bash
python3 --version
```

does **not** show Python 3.10, install it before doing anything else.

On Ubuntu or Debian-like images, use:

```bash
apt-get update
apt-get install -y software-properties-common git wget build-essential cmake ninja-build
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.10 python3.10-venv python3.10-dev
```

If that does not work, check the distro from:

```bash
cat /etc/os-release
```

and use the appropriate package manager for that image.

## 4. Clone the repository

```bash
cd /workspace
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1.git
cd Hunyuan3D-2.1
```

## 5. Create a fresh Python 3.10 virtual environment

```bash
python3.10 -m venv .venv
source .venv/bin/activate
python -V
which python
python -m pip install --upgrade pip setuptools wheel
```

At this point:

- `python -V` should show **Python 3.10.x**
- `which python` should point to `/workspace/Hunyuan3D-2.1/.venv/bin/python`

If it still shows Python 3.12, stop and fix that first.

## 6. Install PyTorch first

The repo specifies this exact PyTorch installation: ([GitHub][1])

```bash
python -m pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124
```

## 7. Install the repo requirements

```bash
python -m pip install -r requirements.txt
```

This is the next official step in the repo's install flow. ([GitHub][1])

## 8. Build the custom rasterizer

```bash
cd hy3dpaint/custom_rasterizer
python -m pip install -e .
cd ../..
```

This is part of the official install sequence. ([GitHub][1])

## 9. Build the differentiable renderer

```bash
cd hy3dpaint/DifferentiableRenderer
bash compile_mesh_painter.sh
cd ../..
```

This is also part of the official install sequence. ([GitHub][1])

## 10. Download the Real-ESRGAN checkpoint

```bash
mkdir -p hy3dpaint/ckpt
wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth -P hy3dpaint/ckpt
```

The repo explicitly includes this download step. ([GitHub][1])

## 11. Start the API server

Use:

```bash
python api_server.py \
  --host 0.0.0.0 \
  --port 8081 \
  --model_path tencent/Hunyuan3D-2.1 \
  --subfolder hunyuan3d-dit-v2-1 \
  --texgen_model_path tencent/Hunyuan3D-2.1
```

The repo includes `api_server.py` for programmatic access. The API server exposes endpoints including `GET /health`, `POST /generate`, `POST /send`, and `GET /status/{uid}`. ([GitHub][2])

If you are tight on memory, you can add:

```bash
--low_vram_mode
```

If you have **48 GB VRAM**, you will usually try **without** that flag first, since the repo's full stated requirement is about **29 GB**. ([GitHub][1])

## 12. Verify the server locally

From inside the instance:

```bash
curl http://127.0.0.1:8081/health
```

If it responds, the API is running.

## 13. Expose the API through the Vast tunnel feature

In the Vast **Instance Portal**, go to the **Tunnels** page and create a tunnel to:

```text
http://localhost:8081
```

Vast's docs say the Tunnels page is for creating access to ports that were not directly opened in the instance, and that tunnel URLs use `trycloudflare.com`. The docs also say links opened from the portal have a secure token appended to help prevent unauthorized access. ([Vast.ai][3])

So after creating the tunnel, you will get a public URL like:

```text
https://some-random-words.trycloudflare.com
```

## 14. Connect your application to the model

Your application should treat the Vast-hosted model as a normal HTTP API.

Set:

```
HUNYUAN3D_API_URL=https://your-random-name.trycloudflare.com
```

Then call endpoints such as:

- `GET /health`
- `POST /generate`
- `POST /send`
- `GET /status/{uid}` ([GitHub][2])

A minimal Python client looks like this:

```python
import base64
import requests

API_BASE = "https://your-random-name.trycloudflare.com"

with open("input.png", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "image": image_b64,
    "remove_background": True,
    "texture": True,
    "seed": 1234,
}

r = requests.post(f"{API_BASE}/generate", json=payload, timeout=3600)
r.raise_for_status()

with open("result.glb", "wb") as f:
    f.write(r.content)
```

The API models support request fields such as image, texture settings, inference settings, and async status tracking. ([GitHub][4])

## 15. Important security note

A `trycloudflare.com` URL is a **Cloudflare Quick Tunnel** URL. Cloudflare says Quick Tunnels are intended for **testing and development only**, not production. Requests to that random public URL are proxied to your local service. ([Cloudflare Docs][5])

So for testing:

- the tunnel URL is enough for your app to connect

For anything more serious:

- add your own authentication
- or move to a more controlled production setup

## 16. Common failure points

The most common setup problems are:

- using Python 3.12 instead of 3.10
- not enough disk space
- missing build tools
- insufficient VRAM
- trying to install into the wrong Python environment

The repo's tested environment is specific enough that matching it closely avoids a lot of problems. ([GitHub][1])

## Minimal copy-paste setup

If your image is Ubuntu-like and supports the commands below, this is the shortest clean path:

```bash
nvidia-smi
df -h
cat /etc/os-release
python3 --version

apt-get update
apt-get install -y software-properties-common git wget build-essential cmake ninja-build
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.10 python3.10-venv python3.10-dev

cd /workspace
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1.git
cd Hunyuan3D-2.1

python3.10 -m venv .venv
source .venv/bin/activate
python -V
which python
python -m pip install --upgrade pip setuptools wheel

python -m pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124
python -m pip install -r requirements.txt

cd hy3dpaint/custom_rasterizer
python -m pip install -e .
cd ../..

cd hy3dpaint/DifferentiableRenderer
bash compile_mesh_painter.sh
cd ../..

mkdir -p hy3dpaint/ckpt
wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth -P hy3dpaint/ckpt

python api_server.py \
  --host 0.0.0.0 \
  --port 8081 \
  --model_path tencent/Hunyuan3D-2.1 \
  --subfolder hunyuan3d-dit-v2-1 \
  --texgen_model_path tencent/Hunyuan3D-2.1
```

Then create a Vast tunnel to:

```text
http://localhost:8081
```

and use the resulting `trycloudflare.com` URL as your application's `HUNYUAN3D_API_URL`. ([Vast.ai][3])

**Remember:** Destroy your instance when done to stop billing.

[1]: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 "Tencent-Hunyuan/Hunyuan3D-2.1"
[2]: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/api_server.py "Hunyuan3D-2.1/api_server.py"
[3]: https://docs.vast.ai/documentation/instances/connect/instance-portal "Instance Portal - Vast.ai Documentation"
[4]: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/api_models.py "Hunyuan3D-2.1/api_models.py"
[5]: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/ "Quick Tunnels · Cloudflare One docs"
