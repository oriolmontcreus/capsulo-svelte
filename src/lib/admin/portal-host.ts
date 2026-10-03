/**
 * Where the persistent admin islands (nav, AI sidebar) render their menus and tooltips. The
 * client router replaces <body> on every navigation, so a portal mounted into it would keep
 * rendering into the old, detached body; this element survives the swap (`transition:persist`).
 */
export const ADMIN_PORTAL_HOST_ID = "admin-portals";
export const ADMIN_PORTAL_HOST = `#${ADMIN_PORTAL_HOST_ID}`;
