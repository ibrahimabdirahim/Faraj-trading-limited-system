// Turns a display name into a reasonable default username (e.g. "Soulemane A." -> "soulemane.a").
// Used to auto-suggest a username in the Add User form while the admin is still typing the
// name — purely a starting point, always editable before saving.
export function suggestUsername(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
  return slug || "user";
}
