# TODO - Fix Site Assignment for Engineers

## Task

Fix the issue where engineers cannot see sites assigned by admin

## Root Cause

When admin assigns sites to a user via UserManagement (PATCH /users/:id), only `User.assignedSites` is updated but `Site.assignedUsers` is not synced, causing engineers to not see their assigned sites when fetching the sites list.

Additionally, the login response was missing:

- `assignedSites` - so users couldn't see their assigned sites after login
- Full role object - only returning role name as string
- `permissions` - so hasPermission() didn't work after login

## Fix Required

Update both user and site routes to ensure bidirectional sync when:

1. Creating users with siteIds
2. Updating users with siteIds
3. Creating sites with userIds
4. Updating sites with userIds
5. Assigning users to sites
6. Also fix login endpoint to include assignedSites, permissions, and full role object

## Steps

- [x]   1. Analyze the codebase and understand the issue
- [x]   2. Fix POST /users - add bidirectional sync for siteIds
- [x]   3. Fix PATCH /users/:id - add bidirectional sync for siteIds
- [x]   4. Fix PATCH /sites/:id - add bidirectional sync for userIds
- [x]   5. Fix POST /sites/:id/users - add bidirectional sync
- [x]   6. Fix DELETE /sites/:id/users/:userId - add bidirectional sync
- [x]   7. Fix login endpoint - return assignedSites, permissions, and full role object
- [x]   8. Verify TypeScript compilation - passed

## Files Modified

- /backend/src/routes/users.ts
- /backend/src/routes/sites.ts
- /backend/src/controllers/authController.ts
