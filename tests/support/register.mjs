import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
const runtime = new URL("./runtime.mjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "cloudflare:workers")
      return { url: runtime, shortCircuit: true };
    if (specifier.endsWith("/chatgpt-auth"))
      return {
        url: new URL("./auth.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier.startsWith(".") && context.parentURL) {
      const u = new URL(specifier, context.parentURL);
      if (existsSync(new URL(u.href + ".ts")))
        return next(u.href + ".ts", context);
    }
    return next(specifier, context);
  },
});
