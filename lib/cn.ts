export function cn(...classes: Array<string | undefined | null | false | Record<string, boolean>>): string {
  const out: string[] = [];
  for (const cls of classes) {
    if (!cls) continue;
    if (typeof cls === "string") {
      out.push(cls);
    } else if (typeof cls === "object") {
      for (const [k, v] of Object.entries(cls)) {
        if (v) out.push(k);
      }
    }
  }
  return out.join(" ");
}
