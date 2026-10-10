import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // `server-only` throws by design outside a React Server Component,
      // which would stop any test importing a module that uses it. The
      // production guard is unaffected — this alias is test-scope only.
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "lib/**/*.test.ts"],
    /**
     * The database tests each boot a Postgres compiled to WebAssembly and
     * replay every migration against it. Several of those running in
     * parallel worker threads contend badly enough to hang: the suite
     * passed file by file and failed when run together, which is the
     * worst way for a suite to behave, because it makes a green run mean
     * nothing. Raising the timeout alone did not fix it — they were
     * hanging, not merely slow — so the files run one at a time.
     *
     * The suite is small and this costs seconds. The timeouts below are a
     * backstop against a genuinely stuck test, not a performance target.
     */
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
