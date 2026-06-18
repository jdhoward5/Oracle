; Custom electron-builder NSIS hooks (auto-included from build/installer.nsh).
;
; The recurring "Sibyl cannot be closed" during an auto-update is a LOCKED-FILE
; problem, and the prompt actually comes from THREE places in electron-builder's
; templates — only one of which (the upfront app-running check) is overridable:
;   - allowOnlyOneInstallerInstance.nsh  (upfront check — overridden here)
;   - extractAppPackage.nsh              (file copy fails because a file is in use)
;   - installUtil.nsh                    (running the old uninstaller fails)
; The last two fire LATER, when NSIS tries to overwrite app files a still-running
; process holds open. The updating Sibyl.exe can take a few seconds to dispose its
; GPU/CUDA context and exit; if extraction starts before it's gone, those locked-
; file prompts trip.
;
; Fix: in the upfront check, force-kill the whole Sibyl.exe process tree (main +
; renderer + GPU + llama workers) and then BLOCK until no Sibyl.exe remains, so by
; the time extraction runs every file handle is released. Never prompts; bounded so
; a genuinely un-killable process (e.g. a GPU driver hang — needs a reboot) can't
; wedge the installer forever. Inserted for both installer and uninstaller.
!macro customCheckAppRunning
  DetailPrint "Closing ${PRODUCT_NAME}…"
  ; 1) Ask it to close first (WM_CLOSE to any GUI process).
  nsExec::Exec `"$SYSDIR\taskkill.exe" /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  StrCpy $R9 0
  sibylWaitLoop:
    ; 2) Force-kill the whole tree, then check the result. taskkill returns 128
    ;    ("no tasks") once nothing named Sibyl.exe is left → safe to proceed.
    nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
    Pop $0
    StrCmp $0 "128" sibylWaitDone
    Sleep 1000
    IntOp $R9 $R9 + 1
    ; Give up after ~30s (un-killable process); let the install proceed/retry.
    IntCmp $R9 30 sibylWaitDone sibylWaitLoop sibylWaitDone
  sibylWaitDone:
  ; 3) Brief settle so the OS + GPU driver release file/device handles.
  Sleep 1500
!macroend
