# GitHub Actions for Stream Mesh

This directory contains GitHub Actions workflows for automated building and releasing of Stream Mesh.

## Workflows

### 🚀 `release.yml` - Build and Release
**Trigger**: Push to `main` branch

**What it does**:
1. Builds the application on both macOS and Windows runners
2. Creates distribution packages (DMG for macOS, EXE for Windows)
3. Creates a new GitHub release with clean filenames
4. Uploads only the essential distribution files (no build artifacts)

**Outputs**:
- `StreamMesh-v{version}-macOS-Intel.dmg`
- `StreamMesh-v{version}-macOS-AppleSilicon.dmg` 
- `StreamMesh-v{version}-Windows-Setup.exe`

**Release naming**: `v{package.version}-{build.number}`

### ✅ `build-check.yml` - Build Verification
**Trigger**: Pull requests to `main` branch

**What it does**:
1. Builds the application on both macOS and Windows runners
2. Verifies that distribution packages are created successfully
3. Does NOT create releases (testing only)

## Requirements

### Repository Settings
Make sure your repository has the following permissions:
- Actions can create releases: `Settings > Actions > General > Workflow permissions > Read and write permissions`

### Secrets
No additional secrets required beyond the default `GITHUB_TOKEN`.

## Usage

### Automatic Releases
1. Merge changes to `main` branch
2. GitHub Actions automatically builds and creates a release
3. Download files from the Releases page

### Manual Testing
1. Create a pull request
2. GitHub Actions builds the app to verify everything works
3. No release is created

## Customization

### Change Version Pattern
Edit the tag creation in `release.yml`:
```yaml
gh release create "v${{ steps.package-version.outputs.version }}-${{ github.run_number }}"
```

### Add More Platforms
Add additional runners to the matrix:
```yaml
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
```

### Modify Release Notes
Edit the release notes template in the `gh release create` command in `release.yml`.
