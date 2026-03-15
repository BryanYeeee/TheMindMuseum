# Running Hunyuan3D-2.1 on Vast.ai

This guide takes you from a fresh SSH session on a new Vast GPU instance to a running Hunyuan3D-2.1 API server that your application can call over HTTPS.

Hunyuan3D-2.1's official repo says it was tested with **Python 3.10** and **PyTorch 2.5.1+cu124**. It also states approximate VRAM requirements of **10 GB for shape generation**, **21 GB for texture generation**, and **29 GB total for shape + texture**. ([GitHub][1])

## 1. Choose a suitable Vast instance

Pick a Linux GPU instance with enough VRAM and disk.

Use **60 GB disk**. In practice, this setup needs it once you account for:

- the repo
- the virtual environment
- pip/cache files
- model downloads
- build artifacts
- generated outputs

Small disks can make installs stall or fail.

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
python -m pip install --upgrade pip wheel
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

Use:

```bash
python -m pip install -r requirements.txt --prefer-binary --no-build-isolation
```

This avoids pip taking a bad build path for core packages.

### If `bpy==4.0` fails

Comment out the `bpy==4.0` line in `requirements.txt` temporarily, finish the rest of the install, then install Blender Python separately later.

## 8. Install Blender Python and required system libraries

Install the Blender package from Blender’s index:

```bash
python -m pip install --extra-index-url https://download.blender.org/pypi/ "bpy==4.0.0"
```

Then install the system libraries it needs:

```bash
apt-get update
apt-get install -y libsm6 libxext6 libxrender1
```

Verify:

```bash
python -c "import bpy; print(bpy.app.version_string)"
```

## 9. Build the custom rasterizer

Use:

```bash
cd hy3dpaint/custom_rasterizer
python -m pip install -e . --no-build-isolation
cd ../..
```

## 10. Build the differentiable renderer

First run the provided script:

```bash
cd hy3dpaint/DifferentiableRenderer
bash compile_mesh_painter.sh
cd ../..
```

If texturing later fails with inpaint import errors, rebuild the extension against the Python 3.10 venv:

```bash
cd /workspace/Hunyuan3D-2.1
source /workspace/Hunyuan3D-2.1/.venv/bin/activate
cd /workspace/Hunyuan3D-2.1/hy3dpaint/DifferentiableRenderer

rm -f mesh_inpaint_processor*.so

c++ -O3 -Wall -shared -std=c++11 -fPIC \
  $(python -m pybind11 --includes) \
  mesh_inpaint_processor.cpp \
  -o mesh_inpaint_processor$(python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))")
```

Verify:

```bash
cd /workspace/Hunyuan3D-2.1
source /workspace/Hunyuan3D-2.1/.venv/bin/activate
python -c "from hy3dpaint.DifferentiableRenderer.mesh_inpaint_processor import meshVerticeInpaint; print('meshVerticeInpaint ok')"
```

## 11. Download the Real-ESRGAN checkpoint

```bash
mkdir -p hy3dpaint/ckpt
wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth -P hy3dpaint/ckpt
```

## 12. Fix setuptools for older dependencies

Some parts of the texture stack still expect `pkg_resources`, which was removed in newer setuptools.

Install:

```bash
python -m pip install --force-reinstall "setuptools<82"
```

Verify:

```bash
python -c "import pkg_resources; print('pkg_resources ok')"
```

Do not upgrade setuptools again afterward.

## 13. Create the expected cache directory

The API server expects this directory to exist:

```bash
mkdir -p gradio_cache
```

## 14. Start the API server

Use:

```bash
python api_server.py \
  --host 0.0.0.0 \
  --port 8081 \
  --model_path tencent/Hunyuan3D-2.1 \
  --subfolder hunyuan3d-dit-v2-1
```

Do **not** pass `--texgen_model_path` here. `api_server.py` does not accept it.

If you are tight on memory, you can add:

```bash
--low_vram_mode
```

If you have **48 GB VRAM**, you can still choose to use `--low_vram_mode`, but it is optional.

## 15. Verify the server locally

From inside the instance:

```bash
curl http://127.0.0.1:8081/health
```

If it responds, the API is running.

If startup fails with `address already in use`, free the port first:

```bash
pkill -f "python api_server.py"
```

## 16. Expose the API through the Vast tunnel feature

In the Vast **Instance Portal**, go to the **Tunnels** page and create a tunnel to:

```text
http://localhost:8081
```

So after creating the tunnel, you will get a public URL like:

```text
https://some-random-words.trycloudflare.com
```

## 17. Connect your application to the model

Your application should treat the Vast-hosted model as a normal HTTP API.

Set:

```bash
HUNYUAN3D_API_URL=https://your-random-name.trycloudflare.com
```

Then call endpoints such as:

- `GET /health`
- `POST /generate`
- `POST /send`
- `GET /status/{uid}` ([GitHub][2])

A minimal async Python client looks like this:

```python
import base64
import time
import requests

API_BASE = "https://your-random-name.trycloudflare.com"

with open("input.png", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "image": image_b64,
    "remove_background": True,
    "texture": True,
    "seed": 1234,
    "type": "glb",
    "octree_resolution": 256,
    "num_inference_steps": 5,
    "guidance_scale": 5.0,
}

resp = requests.post(f"{API_BASE}/send", json=payload, timeout=30)
resp.raise_for_status()
uid = resp.json()["uid"]

while True:
    status_resp = requests.get(f"{API_BASE}/status/{uid}", timeout=30)
    status_resp.raise_for_status()
    data = status_resp.json()

    if data.get("status") == "completed":
        model_bytes = base64.b64decode(data["model_base64"])
        with open("result.glb", "wb") as f:
            f.write(model_bytes)
        break

    if data.get("status") == "error":
        raise RuntimeError(data)

    time.sleep(3)
```

Use the async flow over the tunnel for textured jobs. Textured synchronous requests can exceed tunnel time limits.

## 18. Important security note

A `trycloudflare.com` URL is a **Cloudflare Quick Tunnel** URL. Cloudflare says Quick Tunnels are intended for **testing and development only**, not production. Requests to that random public URL are proxied to your local service. ([Cloudflare Docs][5])

So for testing:

- the tunnel URL is enough for your app to connect

For anything more serious:

- add your own authentication
- or move to a more controlled production setup

## 19. Common failure points

The most common setup problems are:

- using Python 3.12 instead of 3.10
- not enough disk space
- pip building from source instead of using wheels
- `bpy` not being installed from Blender’s index
- missing system libraries for `bpy`
- missing `gradio_cache`
- unsupported `api_server.py` arguments
- `setuptools>=82` removing `pkg_resources`
- the inpaint extension being built for the wrong Python ABI

## Minimal copy-paste setup

If your image is Ubuntu-like and supports the commands below, this is the shortest clean path:

```bash
nvidia-smi
df -h
cat /etc/os-release
python3 --version

apt-get update
apt-get install -y software-properties-common git wget build-essential cmake ninja-build libsm6 libxext6 libxrender1
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

python -m pip install --upgrade pip wheel
python -m pip install --force-reinstall "setuptools<82"

python -m pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124
python -m pip install -r requirements.txt --prefer-binary --no-build-isolation

python -m pip install --extra-index-url https://download.blender.org/pypi/ "bpy==4.0.0"

cd hy3dpaint/custom_rasterizer
python -m pip install -e . --no-build-isolation
cd ../..

cd hy3dpaint/DifferentiableRenderer
bash compile_mesh_painter.sh
rm -f mesh_inpaint_processor*.so
c++ -O3 -Wall -shared -std=c++11 -fPIC \
  $(python -m pybind11 --includes) \
  mesh_inpaint_processor.cpp \
  -o mesh_inpaint_processor$(python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))")
cd ../..

mkdir -p hy3dpaint/ckpt
wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth -P hy3dpaint/ckpt

mkdir -p gradio_cache

python api_server.py \
  --host 0.0.0.0 \
  --port 8081 \
  --model_path tencent/Hunyuan3D-2.1 \
  --subfolder hunyuan3d-dit-v2-1
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
