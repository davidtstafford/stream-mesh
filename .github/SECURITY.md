# Security Considerations for GitHub Actions

## Current Security Setup

This repository implements several security measures for GitHub Actions:

### 🔒 **Pull Request Security**

#### External Forks
- External fork PRs require the `safe-to-test` label before builds run
- Only repository maintainers can add this label
- Automatic comment alerts maintainers to review external PRs

#### Internal/Collaborator PRs  
- PRs from repository collaborators run builds automatically
- PRs from the same repository (branches) run builds automatically

### 🛡️ **Release Security**

- Releases only trigger on direct pushes to `main` branch
- Repository verification prevents builds on forks
- Minimal permissions granted to each job

## For Maintainers

### Reviewing External PRs

**⚠️ CRITICAL**: Before adding the `safe-to-test` label to external PRs:

1. **Review workflow changes**: Check for modifications to `.github/workflows/`
2. **Check for suspicious code**: Look for unusual commands, network calls, or file operations
3. **Verify contributor**: Check the contributor's GitHub profile and history
4. **Test locally first**: Consider pulling the PR locally for testing

### Safe External PR Process

1. External contributor creates PR
2. GitHub Action comments with security notice
3. Maintainer reviews all changes carefully
4. If safe, maintainer adds `safe-to-test` label
5. Build checks run automatically
6. Remove label after review if needed

### Dangerous Patterns to Watch For

- New workflow files (`.github/workflows/*.yml`)
- Modified existing workflows
- Unusual `run:` commands with network access
- Environment variable access (`${{ env.* }}` or `${{ secrets.* }}`)
- File operations outside expected directories
- Cryptocurrency or mining-related commands

## Repository Settings

Recommended settings in **Settings > Actions > General**:

- **Fork pull request workflows**: "Require approval for first-time contributors"
- **Workflow permissions**: "Read repository contents and packages permissions"
- **Allow GitHub Actions to create and approve pull requests**: ❌ Disabled

## Emergency Response

If you suspect a compromised workflow:

1. **Immediately disable Actions**: Settings > Actions > Disable Actions
2. **Review recent workflow runs**: Actions tab
3. **Check for unauthorized releases**: Releases page
4. **Rotate any potentially exposed secrets**
5. **Review repository access logs**: Settings > Security > Audit log

## Additional Recommendations

- Enable **branch protection** on `main` branch
- Require **pull request reviews** before merging
- Enable **"Restrict pushes that create files"** to prevent workflow injection
- Consider using **private runners** for sensitive builds
