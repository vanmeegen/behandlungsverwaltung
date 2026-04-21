#!/usr/bin/env bun
// Post-compile step for the Windows standalone EXE: patches icon and
// VERSIONINFO resources into the PE binary. Bun's `--windows-icon` flag
// only works when compiling on Windows; resedit-js is pure JS so we can
// do this from Linux/macOS.
import * as PELibrary from 'pe-library';
import * as ResEdit from 'resedit';
import { readFile, writeFile } from 'node:fs/promises';

interface Options {
  exePath: string;
  icoPath: string;
  productName: string;
  fileDescription: string;
  companyName?: string;
  fileVersion: [number, number, number, number];
}

export async function injectWindowsResources(opts: Options): Promise<void> {
  const exeData = await readFile(opts.exePath);
  // Stock bun.exe is authenticode-signed; ignoreCert lets us parse it.
  // We don't re-sign on write, so the signature ends up stripped — which
  // is fine because bun --compile appends its payload afterward anyway.
  const exe = PELibrary.NtExecutable.from(exeData, { ignoreCert: true });
  const res = PELibrary.NtExecutableResource.from(exe);

  const icoData = await readFile(opts.icoPath);
  const iconFile = ResEdit.Data.IconFile.from(icoData);
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    1,
    1033,
    iconFile.icons.map((i) => i.data),
  );

  const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  const vi = viList[0] ?? ResEdit.Resource.VersionInfo.createEmpty();
  vi.setFileVersion(...opts.fileVersion);
  vi.setProductVersion(...opts.fileVersion);
  vi.setStringValues(
    { lang: 1033, codepage: 1200 },
    {
      ProductName: opts.productName,
      FileDescription: opts.fileDescription,
      ...(opts.companyName ? { CompanyName: opts.companyName } : {}),
    },
  );
  vi.outputToResourceEntries(res.entries);

  res.outputResource(exe);
  await writeFile(opts.exePath, Buffer.from(exe.generate()));
}

if (import.meta.main) {
  const [exePath, icoPath] = process.argv.slice(2);
  if (!exePath || !icoPath) {
    console.error('Usage: inject-windows-resources.ts <exe> <ico>');
    process.exit(1);
  }
  await injectWindowsResources({
    exePath,
    icoPath,
    productName: 'Behandlungsverwaltung',
    fileDescription: 'Behandlungsverwaltung – Standalone',
    fileVersion: [0, 1, 0, 0],
  });
  console.log(`✓ Icon + version info injected into ${exePath}`);
}
