import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function withExtension(url) {
  const path = fileURLToPath(url);
  if (existsSync(path)) return url;
  if (existsSync(`${path}.ts`)) return new URL(`${url.href}.ts`);
  if (existsSync(`${path}.tsx`)) return new URL(`${url.href}.tsx`);
  if (existsSync(`${path}/index.ts`)) return new URL(`${url.href}/index.ts`);
  return url;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = new URL(`../src/${specifier.slice(2)}`, import.meta.url);
    return nextResolve(withExtension(url).href, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.includes("/src/")) {
    return nextResolve(withExtension(new URL(specifier, context.parentURL)).href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: false,
      },
      fileName: url,
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
