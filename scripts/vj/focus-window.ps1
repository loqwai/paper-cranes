# focus-window: raise the show Chrome to the front on Windows.
# Windows stops painting a Chrome window that is behind another window, so a show browser left
# under the terminal renders black and its page stops answering CDP. A background process may not
# take the foreground, so a synthetic Alt tap first (the documented foreground-lock exemption).
# Usage: powershell -NoProfile -File focus-window.ps1 <profile dir>
param([Parameter(Mandatory)] [string] $ProfileDir)

Add-Type @"
using System; using System.Runtime.InteropServices;
public static class ShowWin {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
}
"@

$ids = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($ProfileDir) } |
  ForEach-Object { $_.ProcessId }
$window = Get-Process -Id $ids -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $window) { Write-Output '{"focused":false,"reason":"no show window"}'; exit 1 }

$h = $window.MainWindowHandle
if ([ShowWin]::IsIconic($h)) { [ShowWin]::ShowWindow($h, 9) | Out-Null }   # SW_RESTORE, only when minimized
[ShowWin]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)                          # Alt down
[ShowWin]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)                          # Alt up
[ShowWin]::SetForegroundWindow($h) | Out-Null
[ShowWin]::BringWindowToTop($h) | Out-Null
Start-Sleep -Milliseconds 150
$ok = [ShowWin]::GetForegroundWindow() -eq $h
Write-Output ('{"focused":' + $ok.ToString().ToLower() + ',"title":' + ($window.MainWindowTitle | ConvertTo-Json) + '}')
