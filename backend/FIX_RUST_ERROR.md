# Fix: Rust/Cargo Installation Error

If you're getting an error about Rust/Cargo not being found during `pip install`, follow these steps:

## Solution 1: Use Pre-built Wheels (Recommended - Easiest)

1. **Update pip first:**
```bash
python.exe -m pip install --upgrade pip
```

2. **Install packages using only pre-built wheels (no compilation):**
```bash
pip install --only-binary :all: -r requirements.txt
```

If that doesn't work, try installing packages one by one:
```bash
pip install --only-binary :all: fastapi uvicorn sqlalchemy python-dotenv pydantic apscheduler plyer python-multipart
```

## Solution 2: Install Rust Properly (If Solution 1 doesn't work)

1. **Close and restart your terminal** (to refresh PATH after Rust installation)

2. **Verify Rust is installed:**
```bash
cargo --version
```

If it shows a version, Rust is installed. If not, continue:

3. **Install Rust from official installer:**
   - Visit: https://rustup.rs/
   - Download and run the installer
   - Follow the installation prompts
   - **Restart your terminal** after installation

4. **Verify installation:**
```bash
rustc --version
cargo --version
```

5. **Try installing again:**
```bash
pip install -r requirements.txt
```

## Solution 3: Use Alternative Package Versions

If the above doesn't work, we can use older versions that don't require Rust:

```bash
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 sqlalchemy==2.0.23 python-dotenv==1.0.0 pydantic==2.4.2 apscheduler==3.10.4 plyer==2.1.0 python-multipart==0.0.6
```

## Solution 4: Use Conda/Miniconda (Alternative)

If you have Anaconda/Miniconda installed:
```bash
conda install -c conda-forge fastapi uvicorn sqlalchemy python-dotenv pydantic apscheduler plyer
pip install python-multipart
```

## Quick Fix Command

Run this in your backend directory (with venv activated):

```bash
python.exe -m pip install --upgrade pip
pip install --only-binary :all: fastapi uvicorn[standard] sqlalchemy python-dotenv pydantic apscheduler plyer python-multipart
```

This should install all packages using pre-built wheels without needing to compile anything.

