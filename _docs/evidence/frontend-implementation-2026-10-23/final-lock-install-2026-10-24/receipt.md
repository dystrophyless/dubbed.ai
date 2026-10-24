# Final lockfile clean installation

Root verification: 2026-10-24 04:37 +05:00, Windows, Node v22.23.1, npm 10.9.8, main HEAD 7845b84d171858628128d9e60e6d3d560f43055a plus authorized uncommitted workspace fixes.

Copied only frontend/package.json and frontend/package-lock.json into the previously nonexistent temporary directory C:\Users\roman\AppData\Local\Temp\dubbed-final-lock-install-a22242d66b694bb39111a79e6cde54f6. Ran npm.cmd ci --no-audit --no-fund there. Exit 0; 173 packages installed in 23 seconds. See install.log. The project node_modules was not used or altered by this command.

The installed manifest includes @radix-ui/react-dropdown-menu ^2.2.1. Root compared both copied package hashes with current source after installation: exact matches. package.json SHA256 D39589829C70537883C578764AB988FDA41C507FDAC416F30C15F53E1913EFD1; package-lock.json SHA256 11DFB89CED5C2F80F56CAF47FEDA10AE7B453FAF23601D071FA5E29B5DA21971.

This proves the current frozen lockfile installs from an empty dependency directory. It is not a fresh-checkout build, final source acceptance, vulnerability audit, real-service or deployment claim. The final integrated checks remain pending.
