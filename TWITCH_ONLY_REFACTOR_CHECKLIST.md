# Twitch-Only Refactor & Cleanup Checklist

This checklist will help track the transition from a multi-platform (generic/stream) app to a Twitch-only app. Checkboxes are provided for each step. Review and check off each item as you complete it.

## 1. Remove Non-Twitch Platform Code
- [ ] Remove all KICK-related authentication, connection, and settings code (backend and frontend)
- [ ] Remove KICK-related UI elements (buttons, forms, settings, etc.)
- [ ] Delete KICK-specific files and modules
- [ ] Remove platform-agnostic abstractions (e.g., eventBus, platformIntegrationService) and make them Twitch-specific
- [ ] Refactor event architecture to only accept Twitch events
- [ ] Remove all code that generates user IDs based on platform + user ID; use Twitch user ID only
- [ ] Remove any references to other platforms in comments, docs, and help files

## 2. Refactor UI for Twitch-Only
- [ ] Remove or hide all UI elements related to other platforms
- [ ] Update onboarding, settings, and help screens to reference only Twitch
- [ ] Make Twitch the default and only selectable platform everywhere
- [ ] Update all platform dropdowns, selectors, and labels to be Twitch-specific

## 3. Clean Up Database and Settings
- [ ] Remove or refactor tables/settings related to other platforms
- [ ] Update database initialization and migration logic to only create/use Twitch-related tables
- [ ] Remove legacy or unused tables (e.g., viewers, settings, events for other platforms)
- [ ] Refactor per-viewer settings to use only Twitch user IDs

## 4. Add Database Wipe & Rebuild Feature
- [ ] Add a UI button labeled "Reset Database" or "Wipe & Rebuild Database" (in settings/advanced)
- [ ] Prompt user for confirmation before wiping
- [ ] Implement backend logic to delete the database file and re-run schema/table creation
- [ ] Show a success/failure message in the UI
- [ ] Test the feature thoroughly (including after schema changes)

## 5. Update Documentation and Help
- [ ] Update README and help pages to reflect Twitch-only support
- [ ] Remove references to other platforms in documentation
- [ ] Document the new database reset feature

## 6. Test and Polish
- [ ] Test all Twitch features to ensure nothing is broken after the refactor
- [ ] Test the database reset feature
- [ ] Remove any dead code, comments, or files related to other platforms
- [ ] Clean up and refactor code for clarity and maintainability

---

**Tip:** As you work through this checklist, add more specific tasks as needed for your codebase. This is a major refactor—take it step by step and commit often!
