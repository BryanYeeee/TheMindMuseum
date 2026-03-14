#!/bin/bash
# =============================================================================
# Vast.ai GPU Instance Setup — Hunyuan3D-2.1 API Server
# =============================================================================
# Run this script on your Vast.ai instance to install and start Hunyuan3D.
#
# Prerequisites:
#   - Vast.ai instance with ≥24GB VRAM (e.g. RTX 3090, RTX 4090, A5000)
#   - PyTorch template selected when creating the instance
#
# Usage:
#   bash setup.sh          # Install + start server
#   bash setup.sh --start  # Start server only (skip install, for restarts)
# =============================================================================

set -e

REPO_DIR="/workspace/Hunyuan3D-2.1"
PORT=8081

# ------------------------------------------------------------------
# Parse args
# ------------------------------------------------------------------
SKIP_INSTALL=false
if [[ "$1" == "--start" ]]; then
    SKIP_INSTALL=true
fi

# ------------------------------------------------------------------
# Install
# ------------------------------------------------------------------
if [[ "$SKIP_INSTALL" == false ]]; then
    echo "============================================"
    echo "  Installing Hunyuan3D-2.1"
    echo "============================================"

    # Clone repo if not already present
    if [[ ! -d "$REPO_DIR" ]]; then
        echo ">>> Cloning repository..."
        git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1.git "$REPO_DIR"
    else
        echo ">>> Repository already exists, pulling latest..."
        cd "$REPO_DIR" && git pull && cd -
    fi

    cd "$REPO_DIR"

    # Install PyTorch (skip if already installed with CUDA)
    if ! python3 -c "import torch; assert torch.cuda.is_available()" 2>/dev/null; then
        echo ">>> Installing PyTorch with CUDA 12.4..."
        pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 \
            --index-url https://download.pytorch.org/whl/cu124
    else
        echo ">>> PyTorch with CUDA already installed, skipping."
    fi

    # Install Python dependencies
    echo ">>> Installing Python requirements..."
    pip install -r requirements.txt

    # Build custom rasterizer
    echo ">>> Building custom rasterizer..."
    cd hy3dpaint/custom_rasterizer
    pip install -e .
    cd ../..

    # Build differentiable renderer
    echo ">>> Building differentiable renderer..."
    cd hy3dpaint/DifferentiableRenderer
    bash compile_mesh_painter.sh
    cd ../..

    # Download Real-ESRGAN weights
    if [[ ! -f "hy3dpaint/ckpt/RealESRGAN_x4plus.pth" ]]; then
        echo ">>> Downloading Real-ESRGAN weights..."
        wget -q https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth \
            -P hy3dpaint/ckpt
    fi

    echo ""
    echo ">>> Installation complete!"
    echo ""
fi

# ------------------------------------------------------------------
# Start the API server
# ------------------------------------------------------------------
cd "$REPO_DIR"

echo "============================================"
echo "  Starting Hunyuan3D-2.1 API Server"
echo "  Port: $PORT"
echo "============================================"
echo ""
echo "First run will download model weights (~5GB) from HuggingFace."
echo "Subsequent starts will be faster."
echo ""

python3 api_server.py \
    --model_path tencent/Hunyuan3D-2.1 \
    --subfolder hunyuan3d-dit-v2-1 \
    --host 0.0.0.0 \
    --port "$PORT" \
    --low_vram_mode
