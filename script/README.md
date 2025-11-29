# Development Environment Setup Scripts

This directory contains automated setup scripts to install and configure the complete development environment for the Full Self Coding project.

## 🚀 Supported Platforms

- **Linux**: Debian/Ubuntu, RHEL/CentOS/Fedora, and other distributions
- **macOS**: Intel and Apple Silicon (M1/M2) Macs
- **Windows**: Windows 10/11 with PowerShell 5.1+ and Chocolatey

## 📋 What Gets Installed

### Core Dependencies
- **Bun.js** (v1.0.0+) - Primary JavaScript runtime and TypeScript executor
- **Docker** (latest) - Container platform for isolated task execution
- **Git** - Version control system (for repository operations)

### Optional Dependencies
- **Node.js** (LTS version) - Alternative JavaScript runtime (for compatibility)
- **npm** - Node package manager (included with Node.js)

### Docker Images
- **node:latest** - Primary Docker image for container execution
- **Optional**: ubuntu:latest, alpine:latest (useful for development)

## 🎯 TypeScript-First Development

The Full Self Coding project is built as a **pure TypeScript monorepo** that runs directly from source files using Bun runtime:

- **No Build Step Required**: TypeScript files are executed directly
- **Fast Development**: Edit source and immediately run without compilation
- **Type Safety**: Full TypeScript support with strict mode enabled
- **Package-Based Architecture**: Monorepo with separate npm packages for core and CLI

## 🛠️ Usage Instructions

### Linux/macOS

```bash
# Make the script executable (if not already)
chmod +x script/setup-dev-env.sh

# Run the setup script
./script/setup-dev-env.sh
```

### Windows (PowerShell)

```powershell
# Run the setup script
.\script\setup-dev-env.ps1

# Or skip Docker Desktop installation if you want to install it manually
.\script\setup-dev-env.ps1 -SkipDockerDesktop

# Force reinstall all components
.\script\setup-dev-env.ps1 -Force
```

## 📝 System Requirements

### Linux
- **Root/sudo access** for installing system packages
- **Package manager**: apt, yum, or dnf
- **Architecture**: x86_64 or ARM64

### macOS
- **macOS 10.15+** (Catalina or newer)
- **Xcode Command Line Tools** (automatically installed)
- **Homebrew** (automatically installed if not present)

### Windows
- **Windows 10/11** (build 17763 or later)
- **PowerShell 5.1+** (included with Windows)
- **Administrator privileges** (for Chocolatey installation)

## 🔧 Installation Details

### Node.js Installation

**Linux/Unix:**
- Uses official NodeSource repositories for package-based installation
- Falls back to binary tarball installation for unsupported distributions
- Installs LTS version for stability

**macOS:**
- Installed via Homebrew for easy updates and management
- Latest LTS version from official repository

**Windows:**
- Installed via Chocolatey package manager
- Includes both Node.js and npm

### Bun.js Installation

**Linux/Unix:**
- Official installation script from bun.sh
- Added to PATH and shell profile
- No system packages required

**macOS:**
- Installed via Homebrew
- Automatically available in PATH

**Windows:**
- Official PowerShell installation script
- Added to current session PATH

### Docker Installation

**Linux:**
- Docker Engine from official repositories
- Docker Compose plugin included
- User added to `docker` group for non-root usage
- Systemd service enabled and started

**macOS:**
- Docker Desktop application
- Includes Docker Engine, Compose, and GUI
- Manual start required

**Windows:**
- Docker Desktop for Windows
- Includes WSL 2 backend
- Manual start required

## 🔍 Script Features

### Intelligent Detection
- **OS Detection**: Automatically detects operating system and distribution
- **Existing Software**: Checks for already-installed components
- **Version Validation**: Ensures minimum version requirements
- **Service Status**: Verifies Docker daemon is running

### Safety Features
- **Non-destructive**: Won't overwrite existing installations unless forced
- **User Confirmation**: Prompts before sensitive operations
- **Rollback Support**: Easy to uninstall via system package managers
- **Permission Checks**: Verifies necessary privileges before installation

### User Experience
- **Colored Output**: Clear status indicators with colors
- **Progress Feedback**: Real-time installation status
- **Error Handling**: Comprehensive error messages and recovery suggestions
- **Summary Report**: Complete installation summary with versions

## 🐛 Troubleshooting

### Common Issues

#### Docker Permission Issues (Linux)
```bash
# If you get permission denied errors with Docker:
sudo usermod -aG docker $USER
# Then log out and log back in, or run:
newgrp docker
```

#### PATH Issues
```bash
# If commands aren't found after installation:
# Refresh your shell session or run:
source ~/.bashrc  # or ~/.zshrc, ~/.profile
```

#### Docker Desktop Not Starting
- **Windows**: Make sure WSL 2 is enabled and updated
- **macOS**: Ensure sufficient disk space and restart if needed
- **Linux**: Check if systemd is running: `systemctl status docker`

#### Bun.js Not Found
```bash
# Manual Bun installation (alternative to script):
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart terminal
```

### Verification Commands

After installation, verify everything is working:

```bash
# Check Node.js and npm
node --version && npm --version

# Check Bun
bun --version

# Check Docker
docker --version && docker info

# Test Docker with Node.js image
docker run --rm node:latest node --version
```

## 🔄 Maintenance

### Updating Components

**Node.js:**
```bash
# Linux/macOS (with Homebrew)
brew upgrade node

# Windows (with Chocolatey)
choco upgrade nodejs-lts

# Linux (with package manager)
sudo apt update && sudo apt upgrade nodejs  # Debian/Ubuntu
sudo yum update nodejs                      # RHEL/CentOS
```

**Bun.js:**
```bash
bun upgrade
```

**Docker:**
- Docker Desktop: Use built-in updater
- Linux Engine: Use system package manager

### Cleanup

If you need to remove the development environment:

**Linux/macOS:**
```bash
# Remove Node.js
sudo apt remove nodejs npm          # Debian/Ubuntu
sudo yum remove nodejs npm          # RHEL/CentOS
brew uninstall node                 # macOS

# Remove Bun
rm -rf ~/.bun

# Remove Docker
sudo apt remove docker*             # Debian/Ubuntu
sudo yum remove docker*             # RHEL/CentOS
```

**Windows:**
```powershell
# Remove via Chocolatey
choco uninstall nodejs docker-desktop

# Remove Bun manually
Remove-Item -Recurse -Force $env:USERPROFILE\.bun
```

## 🆘 Getting Help

### Script-specific Help

1. **Check the logs**: The script provides detailed output for each step
2. **Run with debug**: Add `set -x` at the beginning of the shell script for debugging
3. **Verify prerequisites**: Ensure you have internet access and system permissions

### Additional Resources

- **Node.js Documentation**: https://nodejs.org/docs/
- **Bun.js Documentation**: https://bun.sh/docs
- **Docker Documentation**: https://docs.docker.com/
- **Homebrew Documentation**: https://docs.brew.sh/
- **Chocolatey Documentation**: https://chocolatey.org/docs

## 📄 License

This setup script is part of the Full Self Coding project and follows the same license terms.

## 🤝 Contributing

To improve these setup scripts:

1. Test on your platform and distribution
2. Report any issues or suggestions
3. Submit pull requests with enhancements
4. Add support for additional platforms

---

**Need help?** Open an issue in the main repository: https://github.com/your-org/full-self-coding/issues