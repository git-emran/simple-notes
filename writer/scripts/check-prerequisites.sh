#!/usr/bin/env bash

# check-prerequisites.sh
# Electron + React Cross-Platform Build System Prerequisite Checker
# Detects host environment and ensures packaging tools (fakeroot, dpkg, rpm, snapcraft, etc.) are present.

set -euo pipefail

# ANSI color codes
RED='\033[0,31m'
GREEN='\033[0,32m'
YELLOW='\033[1,33m'
BLUE='\033[0,34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Electron Packaging Prerequisite Checker ===${NC}"

# Detect Operating System
OS="$(uname -s)"
case "${OS}" in
    Linux*)     os_type=Linux;;
    Darwin*)    os_type=Mac;;
    CYGWIN*|MINGW*|MSYS*) os_type=Windows;;
    *)          os_type="UNKNOWN:${OS}"
esac

echo -e "Detected OS: ${GREEN}${os_type}${NC}"

if [ "${os_type}" != "Linux" ]; then
    echo -e "${GREEN}No specific OS level package distribution checks needed for ${os_type}.${NC}"
    echo -e "Make sure you have Node.js and NPM installed, then run: ${YELLOW}npm run build${NC}"
    exit 0
fi

# Detect Package Manager / Distro type
distro="unknown"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    distro="${ID}"
fi
echo -e "Detected Linux Distro: ${GREEN}${distro}${NC}\n"

# Define required tools per format
declare -A tools=(
    ["fakeroot"]="Debian/Ubuntu packages (.deb)"
    ["dpkg"]="Debian/Ubuntu packages (.deb)"
    ["rpmbuild"]="RedHat/Fedora/CentOS packages (.rpm)"
    ["snapcraft"]="Ubuntu Snaps (.snap)"
    ["bsdtar"]="Arch Pacman packages (.pacman)"
    ["desktop-file-validate"]="Linux desktop integration validation"
)

missing_tools=()
present_tools=()

echo -e "${BLUE}Checking system package builders...${NC}"
for tool in "${!tools[@]}"; do
    description="${tools[$tool]}"
    if command -v "$tool" &> /dev/null; then
        echo -e "  [${GREEN}✓${NC}] ${GREEN}${tool}${NC} (Required for ${description})"
        present_tools+=("$tool")
    else
        echo -e "  [${RED}✗${NC}] ${RED}${tool}${NC} (Required for ${description})"
        missing_tools+=("$tool")
    fi
done

echo ""

if [ ${#missing_tools[@]} -eq 0 ]; then
    echo -e "${GREEN}All systems clear! You have all prerequisites installed to build .deb, .rpm, .pacman, and .snap files.${NC}"
    echo -e "To package your app, run: ${YELLOW}npm run build && npm run package:linux${NC}"
    exit 0
fi

echo -e "${YELLOW}Warning: You are missing some optional tools required for specific package formats.${NC}"
echo -e "You can still run the web builds, but packaging to specific formats will fail if the corresponding tool is missing.\n"

# Generate installation commands
echo -e "${BLUE}=== Recommended Install Commands ===${NC}"
case "${distro}" in
    ubuntu|debian|pop|mint)
        apt_packages=()
        for tool in "${missing_tools[@]}"; do
            case "$tool" in
                fakeroot) apt_packages+=("fakeroot") ;;
                dpkg) apt_packages+=("dpkg") ;;
                rpmbuild) apt_packages+=("rpm") ;;
                snapcraft) apt_packages+=("snapcraft") ;;
                bsdtar) apt_packages+=("libarchive-tools") ;;
                desktop-file-validate) apt_packages+=("desktop-file-utils") ;;
            esac
        done
        if [ ${#apt_packages[@]} -gt 0 ]; then
            echo -e "Run the following command to install missing dependencies:"
            echo -e "  ${YELLOW}sudo apt-get update && sudo apt-get install -y ${apt_packages[*]}${NC}"
        fi
        ;;
    fedora|rhel|centos)
        dnf_packages=()
        for tool in "${missing_tools[@]}"; do
            case "$tool" in
                fakeroot) dnf_packages+=("fakeroot") ;;
                dpkg) dnf_packages+=("dpkg") ;;
                rpmbuild) dnf_packages+=("rpm-build") ;;
                snapcraft) dnf_packages+=("snapcraft") ;;
                bsdtar) dnf_packages+=("libarchive") ;;
                desktop-file-validate) dnf_packages+=("desktop-file-utils") ;;
            esac
        done
        if [ ${#dnf_packages[@]} -gt 0 ]; then
            echo -e "Run the following command to install missing dependencies:"
            echo -e "  ${YELLOW}sudo dnf install -y ${dnf_packages[*]}${NC}"
        fi
        ;;
    arch|manjaro)
        pacman_packages=()
        for tool in "${missing_tools[@]}"; do
            case "$tool" in
                fakeroot) pacman_packages+=("fakeroot") ;;
                dpkg) pacman_packages+=("dpkg") ;;
                rpmbuild) pacman_packages+=("rpm-tools") ;;
                snapcraft) pacman_packages+=("snapcraft") ;;
                bsdtar) pacman_packages+=("libarchive") ;;
                desktop-file-validate) pacman_packages+=("desktop-file-utils") ;;
            esac
        done
        if [ ${#pacman_packages[@]} -gt 0 ]; then
            echo -e "Run the following command to install missing dependencies:"
            echo -e "  ${YELLOW}sudo pacman -S --needed ${pacman_packages[*]}${NC}"
        fi
        ;;
    *)
        echo -e "We couldn't generate direct package commands for distro '${distro}'."
        echo -e "Please install the missing tools manually using your package manager: ${RED}${missing_tools[*]}${NC}"
        ;;
esac
